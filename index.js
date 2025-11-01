import path from "path";
import { createInterface } from "readline"
import os from "os"
import fs from "fs/promises"
import { createReadStream } from "fs";
import { rejects } from "assert";


class FileManager {
    username = null;
    interface = null;
    currentPath = null;
    rootDirectory = null;

    constructor() {
        this.rootDirectory = this.getRootDirectory();
        process.chdir(os.homedir())
        this.username = process.argv.find(arg => arg.startsWith('--username='))?.split('=')[1] || 'User';
        this.interface = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '>> '
        })
        this.hiUserName()
        this.setupEventListeners()
        this.interface.prompt()
        this.currentPath = process.cwd();
    }
    setupEventListeners() {
        process.on('SIGINT', () => {
            this.sayGoodbye();
            this.interface.close();
            process.exit(0);
        });
        this.interface.on('close', () => {
            this.sayGoodbye();
            process.exit()
        })
        this.interface.on('line', line => this.parseCommand(line))
    }
    async parseCommand(command) {
        try {
            const [cmd, ...args] = command.trim().split(' ');
            const targetPath = args.join(' ');

            switch (cmd) {
                case '.exit':
                    this.interface.close();
                    break;
                case '.error':
                    throw new Error('тесто вая ошибка')
                    break;
                case 'up':
                    await this.navigateUp();
                    break;
                case 'cd':
                    if (!targetPath) {
                        console.log('Please specify directory path');
                    } else {
                        await this.changeDirectory(targetPath);
                    }
                    break;
                case 'ls':
                    await this.ls();
                    break;
                case 'cat':
                    if (!targetPath) {
                        console.log('Please specify file path');
                    } else {
                        await this.catFile(targetPath);
                    }
                    break;
                case 'add':
                    await this.createFile(targetPath)
                    break;
                case 'mkdir':
                    break;
                case 'rn':
                    break;
                case 'cp':
                    break;
                case 'mv':
                    break;
                case 'rm':
                    break;
                case 'os --EOL':
                    break;
                case 'os --cpus':
                    break;
                case 'os --homedir':
                    break;
                case 'os --username':
                    break;
                case 'os --architecture':
                    break;
                case 'hash path_to_file':
                    break;
                case 'compress path_to_file path_to_destination':
                    break;
                case 'decompress path_to_file path_to_destination':
                    break;

                default:
                    this.showInvalidCommand();
                    break;
            }
        } catch (err) {
            console.log(err)
            this.showOperationFailed();
        } finally {
            this.showCurrentDirectory();
            this.interface.prompt();
        }
    }
    showInvalidCommand() {
        console.log('Invalid input')
    }
    showOperationFailed() {
        console.log(`Operation failed`)
    }
    showCurrentDirectory() {
        console.log(`You are currently in ${process.cwd()}`);
    }
    hiUserName() {
        if (!this.username) {
            console.log('didn\' get username')
            return
        }
        console.log(`Welcome to the File Manager, ${this.username}!`)
        this.showCurrentDirectory()
    }

    sayGoodbye() {
        console.log(`Thank you for using File Manager, ${this.username}, goodbye!`)
    }
    getRootDirectory() {
        if (process.platform === 'win32') {
            return path.parse(process.cwd()).root
        } else {
            return '/'
        }
    }

    async createFile(filename) {
        try {
            await fs.appendFile(path.join(this.currentPath, filename), '', 'utf-8')
            console.log('File was created successfully')
        } catch (error) {
            console.log('File was not created successfully')
        }
    }

    async catFile(pathToFile) {
        console.log(pathToFile)
        const stream = createReadStream(path.join(this.currentPath, pathToFile))
        console.log(path.join(this.currentPath, pathToFile))
        let data = '';
        stream.on('data', chunk => {
            data += chunk.toString()
        })

        stream.on('end', () => { console.log(data) })
        stream.on('error', err => {

        })
        console.log(data)
    }
    // async catFile(pathToFile) {
    //     try {
    //         const fileContent = await readStreamAsPromise(path.join(this.currentPath, pathToFile))
    //         console.log(fileContent)
    //     } catch (error) {
    //         console.error('Error reading file:', error);
    //     }
    // }

    async ls() {
        const objects = await fs.readdir(this.currentPath);
        const results = await Promise.all(
            objects.map(async (obj, index) => {
                try {
                    const fullPath = path.join(this.currentPath, obj);
                    const stats = await fs.stat(fullPath)
                    return {
                        index: index, type: stats.isFile() ? 'file' : (stats.isDirectory() ? 'directory' : null), name: obj,
                    }
                } catch (error) {
                    return {
                        name: obj,
                        index: index,
                        type: 'unknown',
                        error: error.message
                    };
                }
            })
        )
        const sortedResults = results.sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });

        console.table(sortedResults);
        return sortedResults;
    }

    /* async changeDirectory(targetPath) {
        try {
            const currentDir = process.cwd();
            let newDir = '';
            if (targetPath === '' || targetPath === 'up') {
                if (currentDir === this.rootDirectory) {
                    console.log('You are already in the root directory')
                    return
                }

                newDir = path.dirname(currentDir)
            } else {
                let newDir = path.resolve(currentDir, targetPath)
                newDir = path.normalize(newDir)
                await fs.access(newDir)
                const stat = await fs.stat(newDir);

                if (!stat.isDirectory()) {
                    throw new Error('Operation failed: Not a directory');
                }

                if (!newDir.startsWith(this.rootDirectory)) {
                    throw new Error('Operation failed: Access denied');
                }
            }

            process.chdir(newDir);
            this.currentPath = newDir;
            console.log(`Successfully changed directory to: ${newDir}`);

        } catch (err) {
            if (err.code === 'ENOENT' || err.message.includes('Operation failed')) {
                this.showOperationFailed();
            } else {
                console.error('Error:', err.message);
            }
        }
    } */

    async navigateUp() {
        const currentDir = process.cwd();

        if (currentDir === this.rootDirectory) {
            console.log('You are already in the root directory');
            return;
        }

        const parentDir = path.dirname(currentDir);

        if (!parentDir.startsWith(this.rootDirectory)) {
            throw new Error('Operation failed: Access denied');
        }

        process.chdir(parentDir);
        this.currentPath = parentDir;
        console.log(`Moved up to: ${parentDir}`);
    }

    async changeDirectory(targetPath) {
        try {
            const currentDir = process.cwd();
            let newDir = path.resolve(currentDir, targetPath);
            newDir = path.normalize(newDir);

            await fs.access(newDir);
            const stat = await fs.stat(newDir);

            if (!stat.isDirectory()) {
                throw new Error('Operation failed: Not a directory');
            }

            if (!newDir.startsWith(this.rootDirectory)) {
                throw new Error('Operation failed: Access denied');
            }

            process.chdir(newDir);
            this.currentPath = newDir;
            console.log(`Successfully changed directory to: ${this.formatDisplayPath(newDir)}`);

        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log(`Directory not found: ${targetPath}`);
            }
            this.showOperationFailed();
        }
    }

}

const fm = new FileManager()