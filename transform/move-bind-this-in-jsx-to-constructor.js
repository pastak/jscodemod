/**
 * class Component extends React.Component {
 *   constructor() {
 *
 *   }
 *   render () { return <button onClick={this.foo.bind(this)} /> }
 * }
 *
 * -->
 *
 * class Component extends React.Component {
 *   constructor() {
 *     this.foo = this.foo.bind(this)
 *   }
 *   render () { return <button onClick={this.foo} /> }
 * }
 */

export default function transformer(file, api) {
  const j = api.jscodeshift;

  var root = j(file.source);


  var findConstructor = path => path
    .find(j.MethodDefinition)
    .filter(path => path.node.kind === 'constructor')

  var hasChanged = false;
  var transform = root
    .find(j.ClassDeclaration)
    .forEach(path => {
      const classRoot = j(path)
      classRoot
        .find(j.JSXExpressionContainer)
        .filter(path => path.parent.node.type === 'JSXAttribute')
        .forEach(path => {
            const constructorPath = findConstructor(classRoot)
            if (!constructorPath) return
            if (!(
              path.node.expression &&
              path.node.expression.type === 'CallExpression' &&
              path.node.expression.callee &&
              path.node.expression.callee.object &&
              path.node.expression.callee.property &&
              path.node.expression.callee.object.object &&
              path.node.expression.callee.object.property &&
              path.node.expression.callee.object.type === 'MemberExpression' &&
              path.node.expression.callee.object.object.type === 'ThisExpression' &&
              path.node.expression.callee.object.property.type === 'Identifier' &&
              path.node.expression.callee.property.type === 'Identifier' &&
              path.node.expression.callee.property.name === 'bind'
            )) return

            constructorPath
              .forEach(constructorPath => {
                const block = j(constructorPath).find(j.BlockStatement)
                const blockBody = block.get(-1).node.body
                block.replaceWith(p => {
                  return j.blockStatement(
                    blockBody.concat(j.template.statement`this.${path.node.expression.callee.object.property.name} = this.${path.node.expression.callee.object.property.name}.bind(this)\n`)
                  )
                })
                j(path).replaceWith(p => j.template.statement`{this.${path.node.expression.callee.object.property.name}}`)
                hasChanged++;
          });
        })
    })
    if (hasChanged) {
      return transform.toSource({trailingComma: false})
    }
    return null;
}

// module.exports.parser = 'flow';
