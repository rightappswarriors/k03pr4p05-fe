// scripts/fix-react-native-maps.js
const chalk = require('chalk')
const { readFile, writeFile, copyFile, mkdir } = require('fs').promises
const path = require('path')

function log(...args) {
  console.log(chalk.yellow('[react-native-maps]'), ...args)
}

async function patchReactNativeMaps() {
  try {
    const modulePath = path.join('node_modules', 'react-native-maps')

    // Detect directory name: sometimes 'lib', sometimes 'dist'
    const libPath = path.join(modulePath, 'lib')
    const distPath = path.join(modulePath, 'dist')
    const basePath = await checkDir(libPath) ? libPath : distPath

    if (!basePath) {
      throw new Error('Could not find "lib" or "dist" directory in react-native-maps')
    }

    await mkdir(basePath, { recursive: true }) // ensure dir exists

    log(`📦 Patching web compatibility for react-native-maps (${basePath})`)

    const webIndexPath = path.join(basePath, 'index.web.js')
    const webTypesPath = path.join(basePath, 'index.web.d.ts')
    const pkgPath = path.join(modulePath, 'package.json')
    const typesSource = path.join(basePath, 'index.d.ts')

    // Write dummy module
    await writeFile(webIndexPath, 'module.exports = {}', 'utf-8')

    // Copy types if available
    try {
      await copyFile(typesSource, webTypesPath)
    } catch {
      await writeFile(webTypesPath, '// No types available', 'utf-8')
    }

    // Update package.json
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
    pkg['react-native'] = 'lib/index.js'
    pkg['main'] = `${basePath.endsWith('lib') ? 'lib' : 'dist'}/index.web.js`
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8')

    log('✅ Web patch applied successfully!')
  } catch (error) {
    console.error(chalk.red('[react-native-maps] ❌ Failed to apply patch:'), error)
  }
}

async function checkDir(p) {
  const { access } = require('fs').promises
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

patchReactNativeMaps()
