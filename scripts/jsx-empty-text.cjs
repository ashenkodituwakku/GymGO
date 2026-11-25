#!/usr/bin/env node
// Finds JSX children written {a && <X/>} where `a` is a string or a number
// (not null or undefined as well). When a is '' or 0 that value is rendered,
// and React Native refuses text outside <Text>: the phone apps crash with
// "Text strings must be rendered within a <Text> component" (the website only
// warns). Write {a ? <X/> : null} instead. Values that can also be null are
// left out: they're usually messages that are never ''.
//
//   node scripts/jsx-empty-text.cjs     (exits 1 when it finds one)
const path = require('path');
const root = path.join(__dirname, '..', 'apps', 'mobile');
const ts = require(path.join(root, 'node_modules', 'typescript'));
const cfg = ts.getParsedCommandLineOfConfigFile(path.join(root, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const program = ts.createProgram(cfg.fileNames, cfg.options);
const checker = program.getTypeChecker();
const F = ts.TypeFlags;
const AND = ts.SyntaxKind.AmpersandAmpersandToken;
const falsyText = (type) => {
  const parts = type.isUnion() ? type.types : [type];
  if (parts.some((t) => t.flags & (F.Null | F.Undefined | F.Object | F.Boolean | F.BooleanLiteral))) return false;
  return parts.some((t) => t.flags & (F.String | F.Number) || (t.flags & F.StringLiteral && t.value === '') || (t.flags & F.NumberLiteral && t.value === 0));
};
let found = 0;
for (const sf of program.getSourceFiles()) {
  if (!sf.fileName.startsWith(path.join(root, 'src') + path.sep) || !sf.fileName.endsWith('.tsx')) continue;
  const visit = (node) => {
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      let e = node.expression;
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      while (ts.isBinaryExpression(e) && e.operatorToken.kind === AND) {
        let left = e.left;
        while (ts.isParenthesizedExpression(left)) left = left.expression;
        if (!(ts.isBinaryExpression(left) && left.operatorToken.kind === AND) && falsyText(checker.getTypeAtLocation(left))) {
          const { line } = sf.getLineAndCharacterOfPosition(left.getStart());
          console.log(`${path.relative(root, sf.fileName)}:${line + 1}: ${left.getText().slice(0, 80)}`);
          found += 1;
        }
        e = left;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
console.log(found ? `${found} found` : 'None found.');
process.exit(found ? 1 : 0);
