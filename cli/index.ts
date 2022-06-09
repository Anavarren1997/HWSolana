/**
 * PROYECTO PARA ENREDAR UN POCO CON LA LIBREARIA SOLANA/WEB3.JS
 * No hace ninguna interacción con smart contracts
 * 
 * Simplemente trackea el balance de una cuenta.
 */

/*
Comandos para generar lo necesario para el cliente
-   mkdir cli
-   cd cli
-   yarn init
-   yarn add --dev typescript @types/node
-   yarn add @solana/web3.js
-   para ejecutar: npx ts-node index.ts

Es importante tener la ultima version de node porque viene con las build-tools.
Sino, reventaría cuando metemos los comandos de web3. (Lo he sufrido :'D)

*/
import web3 = require('@solana/web3.js');

const connection = new web3.Connection("https://api.devnet.solana.com");
const key: Uint8Array = Uint8Array.from(
    [213,14,214,42,51,232,98,222,158,193,214,150,38,147,86,208,59,218,171,46,207,31,179,227,172,51,109,247,44,103,202,48,145,100,104,100,228,15,202,160,134,205,61,236,82,30,85,244,124,125,45,170,232,14,70,103,202,161,218,144,124,244,179,37]
);

async function main(){
    const signer: web3.Keypair = web3.Keypair.fromSecretKey(key);

    await connection.getAccountInfo(signer.publicKey).then( account => {
        console.log(account);
    });


    await connection.getBalance(signer.publicKey).then( balance => {
        console.log("SOL(lamports): ", balance);
        //Se ve que nos da un balance muy alto, eso es porque nos lo da en la unidad
        //Mas pequeña en la que se puede dividir 1 sol, que es 1 lamport
        //1 sol = 1000000000 lamports, hay que ocnvertir.
        console.log("SOL: ", balance/web3.LAMPORTS_PER_SOL);
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




