// Runs the actual root layout with startup hooks mocked; never opens app data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const React = require('react');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
function load(code, filename, requireMock) {
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: requireMock, process, console }, { filename });
  return module.exports;
}

const layoutPath = path.join(root, 'app/_layout.tsx');
const code = babel.transformSync(fs.readFileSync(layoutPath, 'utf8'), {
  filename: layoutPath, configFile: false, babelrc: false,
  plugins: [['@babel/plugin-transform-typescript', { isTSX: true }], ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;
const View = () => null;
const SafeAreaProvider = () => null;
const Stack = Object.assign(() => null, { Screen: () => null });
let phase;
let stateIndex;
const states = () => [phase.ready, phase.error, 0];
const palette = { background: 'background-token', primary: 'primary-token' };
const variables = { '--background': 'background-token' };
const mocks = {
  react: { ...React, useEffect: () => {}, useState: () => [states()[stateIndex++], () => {}] },
  'react-native': { View, ActivityIndicator: () => null },
  'expo-router': { Stack },
  'expo-status-bar': { StatusBar: () => null },
  'react-native-safe-area-context': { SafeAreaProvider },
  '@expo-google-fonts/inter': { useFonts: () => [phase.fonts] },
  '@/hooks/useThemeRefresh': { useThemeRefresh: () => {} },
  '@/hooks/useCalendarDay': { useCalendarSync: selector => selector({ refreshCounter: 0 }) },
  '@/store/usePreferencesStore': { usePreferencesStore: selector => selector({ dark: false, version: 0 }) },
  '@/constants/theme': { colors: palette, themeVariables: () => variables },
  nativewind: { vars: value => ({ variables: value }) },
  '@/components/QuickAddBottomSheet': { QuickAddBottomSheet: () => null },
  '@/components/ui/EmptyState': { EmptyState: () => null },
};
const RootLayout = load(code, layoutPath, name => mocks[name] || {}).default;
const frames = [
  { ready: false, fonts: false, error: false },
  { ready: false, fonts: true, error: false },
  { ready: false, fonts: true, error: true },
  { ready: false, fonts: true, error: false },
  { ready: true, fonts: true, error: false },
].map(value => {
  phase = value;
  stateIndex = 0;
  const tree = RootLayout();
  assert.equal(tree.type, SafeAreaProvider);
  const wrapper = tree.props.children[1];
  assert.equal(wrapper.type, View);
  assert.deepEqual(wrapper.props.style[1].variables, variables);
  return wrapper;
});

// Reproduce the original failure in NativeWind's real upgrade diagnostic.
const provider = React.createContext({}).Provider;
const renderPath = require.resolve('react-native-css-interop/dist/runtime/native/render-component');
const { renderComponent, UpgradeState } = load(fs.readFileSync(renderPath, 'utf8'), renderPath, name => {
  if (name === 'react') return React;
  if (name === 'react-native') return { View };
  if (name === './styles') return { VariableContext: { Provider: provider } };
  if (name === './globals') return {};
  throw new Error(`Unexpected dependency: ${name}`);
});
const contextPath = path.join(root, 'node_modules/expo-router/build/react-navigation/core/NavigationStateContext.js');
const { NavigationStateContext } = load(fs.readFileSync(contextPath, 'utf8'), contextPath, () => React);
const props = { children: { ownerContext: NavigationStateContext._currentValue } };
const state = variablesState => ({
  variables: variablesState, canUpgradeWarn: false, originalProps: props,
  animated: UpgradeState.NONE, containers: UpgradeState.NONE, pressable: UpgradeState.NONE,
});
const previous = state(UpgradeState.NONE);
renderComponent(View, previous, {}, {}, {}, {});
previous.variables = UpgradeState.SHOULD_UPGRADE;
assert.throws(() => renderComponent(View, previous, props, {}, {}, {}), /Couldn't find a navigation context/);
const fixed = state(UpgradeState.SHOULD_UPGRADE);
for (const frame of frames) {
  const rendered = renderComponent(View, fixed, props, {}, frame.props.style[1].variables, {});
  assert.equal(rendered.type, provider);
}
console.log('PASS: reproduced the old startup crash; initial theme provider survives loading, error, retry, and ready renders.');
