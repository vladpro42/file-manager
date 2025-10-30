import path from "path";
import { createInterface } from "readline"


class FileManager {
    username = null;
    interface = null;

    constructor() {
        this.username = process.argv[3] ? process.argv[3].split('=')[1] : null
        this.interface = createInterface({
            input: process.stdin,
            output: process.stdout
        })
        this.start()
    }
    start() {
        if (!this.username) {
            console.log('didn\' get username')
            return
        }
        console.log(`Welcome to the File Manager, ${this.username}!`)

        this.interface.question('Enter a command or .exit ', answer => {
            if (answer.toLowerCase() == '.exit') {
                this.interface.close();
                return;
            }

            console.log(`You are currently in ${process.cwd()}`)
        })
    }
}

const fm = new FileManager()