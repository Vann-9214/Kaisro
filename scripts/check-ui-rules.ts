import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
const uiRoots = ['app', 'src/components', 'src/hooks', 'src/store', 'src/constants', 'src/utils'];
const formFiles = new Set([
  'src/components/QuickAddBottomSheet.tsx',
  'src/components/ui/EditorSheet.tsx',
  'src/components/ui/DateTimeField.tsx',
  'src/components/ui/SheetSaveFooter.tsx',
  'app/categories.tsx',
]);
const requiredTabs = ['EventForm', 'TaskForm', 'ExpenseForm', 'NoteForm'];
const errors: string[] = [];

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

function report(file: string, source: ts.SourceFile, node: ts.Node, message: string) {
  const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  errors.push(`${path.relative(root, file).replace(/\\/g, '/')}:${line}: ${message}`);
}

for (const file of uiRoots.flatMap(dir => listFiles(path.join(root, dir)))) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isForm = formFiles.has(relative) || /(?:Form|Sheet)\.tsx$/.test(relative);
  const isSheet = isForm && relative !== 'src/components/lifted-input/LiftedInputHost.tsx';

  function visit(node: ts.Node): void {
    if (relative !== 'src/constants/theme.ts' &&
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        /#[0-9a-fA-F]{3,8}\b/.test(node.text)) {
      report(file, source, node, 'hardcoded hex color; use a semantic theme token');
    }
    if ((isSheet || relative === 'src/components/lifted-input/LiftedInputHost.tsx') &&
        ts.isJsxAttribute(node) && node.name.text === 'autoFocus') {
      report(file, source, node, 'autoFocus is forbidden in sheets and forms');
    }
    if (isSheet && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'focus') {
      report(file, source, node, '.focus() is forbidden in sheets and forms');
    }
    if (isSheet && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(source) === 'TextInput') {
      report(file, source, node, 'TextInput in a sheet must use LiftedField and LiftedInputHost');
    }
    if (isForm && ts.isPropertyAssignment(node)) {
      const key = node.name.getText(source).replace(/['"]/g, '');
      if (/^(?:padding|margin|gap|rowGap|columnGap)/.test(key) &&
          (ts.isNumericLiteral(node.initializer) ||
           ts.isPrefixUnaryExpression(node.initializer) && ts.isNumericLiteral(node.initializer.operand))) {
        const value = Number(node.initializer.getText(source));
        if (value !== 0 && ![4, 8, 12, 14, 20, 32].includes(value)) {
          report(file, source, node, `spacing ${value}dp is outside the shared scale`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  if (relative === 'src/components/QuickAddBottomSheet.tsx') {
    const code = source.getFullText();
    for (const tab of requiredTabs) {
      if (!code.includes(`<${tab}`)) report(file, source, source, `quick-add tab ${tab} is missing`);
    }
    if (!code.includes('<SheetSaveFooter') || !code.includes('footer={fixedFooter}') ||
        !code.includes('<LiftedInputHost footer={fixedFooter}')) {
      report(file, source, source, 'all quick-add create/edit tabs must render the shared Save footer, including with the keyboard');
    }
  }
  if (relative === 'src/components/ui/EditorSheet.tsx') {
    const code = source.getFullText();
    if (!code.includes('<SheetSaveFooter') || !code.includes('footer={footer}') ||
        !code.includes('<LiftedInputHost footer={footer}')) {
      report(file, source, source, 'edit sheet must render the shared Save footer, including with the keyboard');
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('UI source rules passed.');
}
