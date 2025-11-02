import path from "path";
import { createInterface } from "readline"
import os from "os"
import fs from "fs/promises"
import { createReadStream, createWriteStream } from "fs";
import { createHash } from "crypto";
import { pipeline } from "stream/promises";
import zlib from "zlib"


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
            const targetPath = args[0]; // join(' ')
            const destPath = args[1];

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
                    await this.createDir(targetPath)
                    break;
                case 'rn':
                    await this.renameFile(targetPath, destPath)
                    break;
                case 'cp':
                    await this.copyFile(targetPath, destPath)
                    break;
                case 'mv':
                    await this.moveFile(targetPath, destPath)
                    break;
                case 'rm':
                    await this.deleteFile(targetPath)
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
                case 'hash':
                    await this.calcHash(targetPath)
                    break;
                case 'compress':
                    await this.compress(targetPath, destPath)
                    break;
                case 'decompress':
                    await this.decompress(targetPath, destPath)
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

    async createDir(dirname) {
        try {
            await fs.mkdir(path.join(this.currentPath, dirname))
            console.log(path.join(this.currentPath, dirname))
            console.log('Directory was created successfully')
        } catch (error) {
            if (error.code === 'EPERM') {
                console.error(error.message)
                return
            }
            console.error('Directory was not created')
        }
    }

    async moveFile(source, dest) {
        try {
            const sourceFileName = path.join(this.currentPath, source)
            const destFileName = path.join(this.currentPath, dest)
            const isSourceFile = await this._isExistsFile(sourceFileName)
            let destExists = false;
            try {
                await fs.access(destFileName);
                destExists = true;
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }

            if (!isSourceFile) {
                console.error('Error: Source is not a file');
                return;
            }

            if (destExists) {
                console.error('Error: File "' + dest + '" already exists in this folder');
                return;
            }
            await this._copyWithStreams(sourceFileName, destFileName)
            await fs.unlink(sourceFileName)
            console.log('Original file deleted');
        } catch (error) {
            console.error(error.message)
        }
    }

    async calcHash(filename) {
        try {
            const fullFileName = path.join(this.currentPath, filename)
            const isExists = this._isExistsFile(fullFileName)
            if (isExists) {
                const hash = createHash('sha256')
                const readStream = createReadStream(fullFileName)
                await pipeline(readStream, hash)
                const hexHash = hash.digest('hex')
                console.log(hexHash)
            }
        } catch (error) {
            console.log('Error: ')
        }
    }

    async _isExistsFile(filename) {
        try {
            return (await fs.stat(filename)).isFile()
        } catch (error) {
            return false
        }
    }

    async deleteFile(filename) {
        try {
            const isFile = await this._isExistsFile(path.join(this.currentPath, filename))
            if (isFile)
                await fs.unlink(path.join(this.currentPath, filename))
            else
                throw new Error('The file was not found');
        } catch (error) {
            console.error(error.message)
        }
    }

    /* async _copyWithStreams(sourceFileName, destFileName) {
    try {
        const readStream = createReadStream(sourceFileName);
        const writeStream = createWriteStream(destFileName);
        
        await pipeline(readStream, writeStream);
        console.log('File copied successfully');
        
    } catch (err) {
        console.error(err);
        throw err;
    }
}*/

    _copyWithStreams(sourceFileName, destFileName) {
        return new Promise((resolve, reject) => {
            const readStream = createReadStream(sourceFileName)
            const writeStream = createWriteStream(destFileName)
            readStream.pipe(writeStream)
            readStream.on('error', (err) => {
                console.error('Ошибка чтения:', err);
                reject(err);
            });

            writeStream.on('error', (err) => {
                console.error('Ошибка записи:', err);
                reject(err);
            });

            writeStream.on('finish', () => {
                console.log('File copied successfully');
                resolve();
            });
        })
    }

    async copyFile(source, dest) {
        try {
            const sourceFileName = path.join(this.currentPath, source)
            const destFileName = path.join(this.currentPath, dest)

            const isSourceFile = (await fs.stat(sourceFileName)).isFile()

            let destExists = false;
            try {
                await fs.access(destFileName);
                destExists = true;
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }

            if (!isSourceFile) {
                console.error('Error: Source is not a file');
                return;
            }

            if (destExists) {
                console.error('Error: File "' + dest + '" already exists in this folder');
                return;
            }

            await this._copyWithStreams(sourceFileName, destFileName)

            // await fs.copyFile(sourceFileName, destFileName)
            // console.log('File copied successfully');

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error('Source file was not found')
            } else {
                console.error(error.message)
            }
        }
    }

    async renameFile(source, dest) {
        try {
            const sourcePath = path.join(this.currentPath, source);
            await fs.access(sourcePath)
            const isFile = (await fs.stat(sourcePath)).isFile()
            if (isFile) {
                await fs.rename(sourcePath, path.join(this.currentPath, dest))
                console.log('The file was renamed successfully')
                return
            }
            throw new Error('it is not file, plese enter source to file')
        } catch (error) {
            console.error(error.message)
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

    async compress(source, dest) {
        try {
            const sourceFullPath = path.join(this.currentPath, source)
            const destFullPath = path.join(this.currentPath, dest)
            const readStream = createReadStream(sourceFullPath)
            const gzip = zlib.createGzip();
            const writeStream = createWriteStream(destFullPath)
            await pipeline(readStream, gzip, writeStream)
            console.log('archive was created')
        } catch (error) {
            console.error(error.message)
        }
    }
    async decompress(source, dest) {
        try {
            const sourceFullPath = path.join(this.currentPath, source)
            const destFullPath = path.join(this.currentPath, dest)
            const readStream = createReadStream(sourceFullPath)
            const unzip = zlib.createGunzip();
            const writeStream = createWriteStream(destFullPath)
            await pipeline(readStream, unzip, writeStream)
            console.log('archive was unzip')
        } catch (error) {
            console.error(error.message)
        }
    }

}

const fm = new FileManager()