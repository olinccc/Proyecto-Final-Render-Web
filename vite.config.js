import restart from 'vite-plugin-restart'

export default {
    root: 'src/',
    publicDir: '../static/',
    server:
    {
        host: true,
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'src/index.html',
                page2: 'src/page2.html',
                page3: 'src/page3.html',
            }
        }
    },
    plugins:
    [
        restart({ restart: [ '../static/**', ] })
    ],
}