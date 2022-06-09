/*****************************************************************************
 *                  Ojito que aquí se vienen cosas ya
 * 
 * Este cliente interacciona con el contrato inteligente lib.rs, que básicamente
 * es un Hello World. El contrato inteligente suma 1 al contador de la cuenta
 * que interacciona con el, el contador representa las veces que ha sido saludada
 * la cuenta. Todo está explicado en lib.rs
 * 
 * Ahora bien, cuando se crea una Wallet mediante la cli de Solana, tiene una serie
 * de parámetros, que se pueden ver con connection.getAccountInfo(), entre los cuales 
 * está el 'ownerId'. Este Id es el del programa que tiene derecho a escribir sobre 
 * dicha cuenta, el cual por defecto es SystemProgram, de Solana.
 * 
 * Entonces, si el Smart Contract necesita una cuenta cuyo ownerId sea el del propio
 * SmartContract, y por defecto las cuentas tienen como ownerId SystemProgram, y además
 * no se puede modificar, ¿Cómo pollas interaccionamos con el SmartContract? 
 * 
 * Pues con las PDAs. ¿Y qué cojones es una PDA? Las siglas se entienden como
 * Program Derived Account, y es una cuenta con clave pública en la red de solana
 * pero que no está asociada en un par clave pública-privada. Es decir, no es como
 * una Wallet normal en la que a partir de una clave privada le aplicamos una operación
 * y sacamos la pública. (f(x) = y | x -> clave privada y -> clave publica).
 * 
 * Estas PDAs salen de la combinación de una clave pública de una wallet normal, una 
 * semilla (una seed, como funciona comunmente en el ámbito de la programación)
 * y un programId. Cuando se aplica una funcion a esos parámetros, nos devuelve
 * una dirección derivada que representa esa PDA (para esa clave publica, semilla
 * e id del programa), por lo que ya tenemos una cuenta que posee nuestro Smart Contract :D.
 * 
 * En este ejemplo pasa una cosilla bastante peculiar, la cual procedo a explicar.
 * En el programa tenemos 2 parametros que son:
 *  payer: Keypair que es quien paga las transacciones
 *  programId: id de la direccion que tiene el smart contract.
 * Por tanto la clavePublica de la PDA sale de la clave publica del payer,
 * el id del programa y una semilla arbitratia, que es un string.
 * 
 * Despues de tener la clave de la PDA, hay que crear la cuenta de la misma,
 * y esto se hace mediante una instruccion, la cual como parametros tiene 2
 * cositas clave:
 *  -fromPubKey: la clave publica de la que deriva(en este caso la del payer)
 *  -la clave publica propia de la cuenta, que es la calculada anteriormente.
 * 
 * Despues de haber creado la instruccion, hay que mandar la transaccion a la blockchain,
 * con un metodo que tiene 3 parametros: la conexion, instruccion y pagador.
 * 
 * ¿Qué pasa? Pues que el pagador que se incluye en la transaccion tiene que coincidir
 * con el campo fromPubKey de la instruccion que crea la cuenta de la PDA, que a su vez
 * tiene que coincidir con la clave publica que ha originado la clave de la PDA.
 * 
 * En otras palabras, con este programa lo único que se puede conseguir es saludarse
 * a ti mismo. Para saludar a otra cuenta de la blockchain, tendrias que generar
 * su PDA, y no es posible puesto que después esa cuenta a la que quieres saludar
 * tendría que pagar la transacción. (Si no te lo crees, trastea con los parámetros,
 * a mi me ha dado error cada vez que los tocaba)
 * 
 * Por tanto, este proyecto se acaba aqui, saludándote a ti mismo, y comprendiendo
 * un poco más como funciona todo esto. 
 * 
 * La solución para tú, con tu cuenta, generar tu PDA, pagar la transaccion, pero saludar
 * a otra persona que no seas tú, creo que está en el campo instruction_data de los SmartContracts
 * que aún no hemos utilizado.
 * 
 *****************************************************************************/

/*
Comandos para generar lo necesario para el cliente
-   mkdir cli
-   cd cli
-   yarn init
-   yarn add --dev typescript @types/node
-   yarn add @solana/web3.js
-   yarn add borsh
-   importar web3.js y borsh
-   para ejecutar: npx ts-node index.ts

Es importante tener la ultima version de node porque viene con las build-tools.
Sino, reventaría cuando metemos los comandos de web3. (Lo he sufrido :'D)

*/
import web3 = require('@solana/web3.js');
import borsh = require("borsh");
import { create } from 'domain';
import { pathToFileURL } from 'url';

/**
 * Connection to the network
 */
 let connection: web3.Connection;

 /**
  * Keypair associated to the fees' payer
  */
 let payer: web3.Keypair;
 
 /**
  * Hello world's program id
  */
 let programId: web3.PublicKey;
 
 /**
  * La cuenta a la que queremos saludar, que es una PDA. (Si queremos saludar a la Wallet de Pepito
  * esta representa un Keypair de clave privada publica. Si vemos la info de la Wallet de Pepito, 
  * el ownerId es SystemProgram. Al ser ese su owner, no puede interaccionar con nuestro Smart Contract
  * porque el ownerId de la Wallet de Pepito no es neustro SmartContract. Por tanto, tenemos que crear
  * una PDA asociada a la Wallet de Pepito par anuestro smart contract para asi poder interaacionar :D).
  */
 let greetedPubkey: web3.PublicKey;

 /**
 * The state of a greeting account managed by the hello world program
 */
class GreetingAccount {
    counter = 0;
    constructor(fields: {counter: number} | undefined = undefined) {
      if (fields) {
        this.counter = fields.counter;
      }
    }
  }
  
  /**
   * Borsh schema definition for greeting accounts
   */
  const GreetingSchema = new Map([
    [GreetingAccount, {kind: 'struct', fields: [['counter', 'u32']]}],
  ]);
  
  /**
   * The expected size of each greeting account.
   */
  const GREETING_SIZE = borsh.serialize(
    GreetingSchema,
    new GreetingAccount(),
  ).length;


async function main(){
    
    //Esperamos a que se establezcan los valores iniciales
    //Por hacerlo un poco más modular
    await init();

    console.log("Parametros iniciados.");
    //Ahora vendrian un monton de comprobaciones de si el SmartContract
    //Esta desplegado, establecer el pagador, etc. No las voy a hacer
    //Porque esto es un ejemplo basico ya con el programa desplegado y un pagador con fondos.

    //Ahora viene la parte de la creacion de la PDA, vamos a ver como cambia el balance del
    //Pagador de tasas.

    await createPDA();

    console.log('Address que genera la PDA: ',payer.publicKey.toBase58());
    console.log('Address de la PDA: ',greetedPubkey.toBase58());

    await sayHello();
    await reportGreetings();

}

/**
 * En esta funciona voy a establecer valores iniciales importantes.
 * Establece la conexion al nodo, el pagador de las tasas
 * Y el id de la cuenta que tiene contrato inteligente con el que se va a interaccionar
 */
async function init() {
    connection = new web3.Connection(web3.clusterApiUrl("devnet")); //conexion a la devnet
    //Esto obviamente se hace de otra forma porque cualquiera que vea este código roba la cuenta(ahora nos da igual pq estamos en devnet)
    const payerPrivateKey: Uint8Array = Uint8Array.from(
        [213,14,214,42,51,232,98,222,158,193,214,150,38,147,86,208,59,218,171,46,207,31,179,227,172,51,109,247,44,103,202,48,145,100,104,100,228,15,202,160,134,205,61,236,82,30,85,244,124,125,45,170,232,14,70,103,202,161,218,144,124,244,179,37]
    );

    //este es el pringao que va a pagar las tasas como por ejemplo las de hacer los PDAs
    payer = web3.Keypair.fromSecretKey(payerPrivateKey);
    
    //Y este el Id de la cuenta que tiene el contrato inteligente 
    programId = new web3.PublicKey("4nDh9ZgHycdwwUkA8nKo7wkeAWDbHzmyRsUMjbshLB8j");

}

/**
 * Función que crea la PDA a la que saludar que tendrá como owner el Smart contract, la cual está relacionada con la persona
 * que paga la transacción.
 */
async function createPDA(){
    //Es importante saber que la cuenta que debe ownear el SmartContract es la persona
    //A saludar, no la persona que paga las fees. En este ejemplo son la misma persona.

    //Semilla a partir de la cual creamos la PDA. Al igual que funcionan todas las seeds
    //Si le damos siempre el mismo string, publicKey y programId, siempre creará la misma
    //clave publica.
    const GREETING_SEED = "hola";
    //Obtenemos una clave publica valida.
    greetedPubkey = await web3.PublicKey.createWithSeed(
        payer.publicKey,
        GREETING_SEED,
        programId,
      );
    //Ahora hay que comprobar si existe una cuenta con esa clave publica(si ya la hemos creado)
    const greetedAccount = await connection.getAccountInfo(greetedPubkey);
    if (greetedAccount === null) {
        await connection.getBalance(payer.publicKey).then( balance => {
            console.log("Payer's balance before creating PDA: ", balance/web3.LAMPORTS_PER_SOL);
        } );
        console.log(
        'Creating account',
        greetedPubkey.toBase58(),
        'to say hello to',
        );
        const lamports = await connection.getMinimumBalanceForRentExemption(
        GREETING_SIZE,
        );

        const transaction = new web3.Transaction().add(
        web3.SystemProgram.createAccountWithSeed({
            fromPubkey: payer.publicKey,
            basePubkey: payer.publicKey,
            seed: GREETING_SEED,
            newAccountPubkey: greetedPubkey,
            lamports,
            space: GREETING_SIZE,
            programId,
        }),
        );
        await web3.sendAndConfirmTransaction(connection, transaction, [payer]);
        
        await connection.getBalance(payer.publicKey).then( balance => {
            console.log("Payer's balance after creating PDA: ", balance/web3.LAMPORTS_PER_SOL);
        } );
    }
}

async function sayHello(){
    console.log('Saying hello to', greetedPubkey.toBase58());
    const instruction = new web3.TransactionInstruction({
      keys: [{pubkey: greetedPubkey, isSigner: false, isWritable: true}],
      programId,
      data: Buffer.alloc(0), // All instructions are hellos
    });
    await web3.sendAndConfirmTransaction(
      connection,
      new web3.Transaction().add(instruction),
      [payer],
    );
  }

  /**
 * Report the number of times the greeted account has been said hello to
 */
async function reportGreetings(){
    const accountInfo = await connection.getAccountInfo(greetedPubkey);
    if (accountInfo === null) {
      throw 'Error: cannot find the greeted account';
    }
    const greeting = borsh.deserialize(
      GreetingSchema,
      GreetingAccount,
      accountInfo.data,
    );
    console.log(
      greetedPubkey.toBase58(),
      'has been greeted',
      greeting.counter,
      'time(s)',
    );
  }


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




