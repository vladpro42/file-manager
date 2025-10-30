import path from "path";
import { createInterface } from "readline"
import os from "os"
import fs from "fs/promises"


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
            prompt: '>>'
        })
        this.hiUserName()
        this.setupEventListeners()
        this.interface.prompt()
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
            switch (command) {
                case '.exit':
                    this.interface.close();
                    break;
                case '.error':
                    throw new Error('тесто вая ошибка')
                    break;
                case 'up':
                    await this.changeDirectory('')
                    break;

                default:
                    this.showInvalidCommand()
                    break;
            }
        } catch (err) {
            this.showOperationFailed()
        } finally {
            this.showCurrentDirectory()
            this.interface.prompt()
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
    async changeDirectory(targetPath) {
        try {
            const currentDir = process.cwd()
            let newDir = path.resolve(currentDir, targetPath)
            newDir = path.normalize(newDir)

            await fs.access(newDir)

            // проверить на папку
            // проверить на корень
            process.chdir(newDir);

        } catch (err) {
            if (err.code === 'ENOENT') {
                this.showOperationFailed()
            }
        }
    }

}

const fm = new FileManager()