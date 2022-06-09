/************************************************************
    NOTAS IMPORTANTES DE LA BLOCKCHAIN EN HIGH LEVEL

    ProgramID: 4nDh9ZgHycdwwUkA8nKo7wkeAWDbHzmyRsUMjbshLB8j
    Deployer: AnYvCukhkJXHYNxbpD3yBciCGTDADKBe89hCDYa35tSp
************************************************************/

//Los datos no se meten en la Blockchain de forma arbitraria, se inyectan
//A través de las cuentas de la Blockchain.

//Por tanto este Smart contract va a ser el 'data' que va a vivir dentro de una
//cuenta.

//Toda cuenta en solana para ser accedida y modificable tiene que ser poseida
//por un contrato. Esto no significa que el contrato sea el dueño de la cuenta
//Sino que simplemente la tiene como registro o algo asi.

//Las macros en Rust son comandos que se han hecho para facilitar la tarea del programador
//Representan varias lineas de codigo que serían más tediosas y dificiles de comprender
//Que simplemente ejecutar el comando que representa la macro.

//Hay una cosa importante a tener en cuenta que usaremos después que son los lamports y los rents
//De las cuentas. Los lamports son los fondos monetarios de la cuenta, y a cada cuenta
//En solana tiene que pagar una 'rent' con el fin de existir dentro de Solana y que no
//Se elimine dicha cuenta. Para no tener que estar pendiente de esto, si una cuenta posee
//x cantidad de lamport(dinero) no se le cobrará la renta y no podrá ser eliminada.
//Esto se hace porque la red está configurada para soportar un gran nº de transacciones/s
//Por lo que esto libera un poco de tráfico de la misma.

//Hay un límite de computación que hay que conocer para que no pasen cosas raras
//Con nuestros contratos inteligentes.

/***********************************************************
    EXPLICACIÓN CÓDIGO
************************************************************/

//Esta librería sirve para codificar y descodificar el 'data' de las cuentas.
//Por convenio el 'data' de las cuentas se representa como un array de u8
//De esta manera el programador puede codificar lo que sea (objeto,string, blablabla)
//En formato u8 y luego descodificarlo.
use borsh::{BorshDeserialize, BorshSerialize};


use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

/// Define the type of state stored in accounts
/*
    Esta estructura en una variable global del contrato inteligente como podríamos declararla
    en cualquier otro lenguaje (C++, Java, Javascript, etc.)
    Representa el nº de veces que se están saludando a una cuenta a través del contrato inteligente.
    
    El derive extiende la funcionalidad de la struct GreetingAccount con los métodos
    de BorshSerialize, Deserialize y Debu. Es la 'manera' que tiene rust de implementar
    herencia. La otra manera es con los 'traits' y las interfaces, pero esta es mas sencilla.
    Es otra macro al fin y al cabo.
    Extiende los metodos de codificar y decodificar porque para meter estos datos en las
    //cuentas tiene que tener un formato especifico.
*/
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GreetingAccount {
    /// number of greetings
    pub counter: u32,
}

// Declare and export the program's entrypoint
/*
    El entrypoint es una incorporacion muy buena de solana.
    Este hace que no tengamos que tener un único Smart Contract en el que escribir
    todo el código (espagueti).
    Un Smart Contract puede llamar a otro Smart Contract.
    (Esto hay que ver como se hace :D)
*/ 

entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Es la clave de la cuenta en la cual está almecenado el contrato inteligente
    accounts: &[AccountInfo], // La lista de cuentas a las que el programa necesita tener acceso(se necesita algo más de explicacion aqui)
    _instruction_data: &[u8], // Explicar más tb, como este programa no hace nada, lo ignora con el '_'
) -> ProgramResult {
    msg!("Hello World Rust program entrypoint");

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    // Get the account to say hello to
    let account = next_account_info(accounts_iter)?;

    // The account must be owned by the program in order to modify its data
    /*
        Basicamente esta linea verifica que la persona a la que queremos realizar una
        accion, es decir, decirle hola, es el Id del programa.

        Es decir, si el que posee la cuenta a nivel de ownership, es el programa 
        desplegado, le dice hola.

        PREGUNTA: ¿que pasa si una cuenta la poseen varios programas?
        OTRA PREGUNTA: ¿Cuando un usuario interacciona con el Smart Contract, este automaticamente lo añade 
        a su lista de direcciones?
    */
    if account.owner != program_id {
        msg!("Greeted account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Increment and store the number of times the account has been greeted
    /*
        La cuenta que interacciona con el contrato inteligente es del tipo de 
        datos GreetingAccount, que solo tiene un contador.
        Por tanto, coge el campo data de la account que viene, la convierte a
        GreetingAccount descodificandola, y la hace mutable.

        A greeting_account, que es la cuenta que interacciona con el contraro, y que
        es del tipo GreetingAccout, le coge el contador y le suma 1.

        Luego lo codifica de nuevo para así los datos ir a la blockchain(creo), aunque
        no hay ninguna línea que vea que lo mande de vuelta a la Blockchain. Puede ser que
        simplemente por ser una cuenta que posee el contrato inteligente, cuando accede
        a los datos ya los modifica directamente en la blockchain. Sea cual sea la forma en 
        que lo haga, se ha de descodificar y codificar.

        Es importante diferenciar que los datos no los tiene el programa en este caso
        El programa simplemente se mete en el campo data de la cuenta y le va incrementando
        un contador.
    */
    let mut greeting_account = GreetingAccount::try_from_slice(&account.data.borrow())?;
    greeting_account.counter += 1;
    greeting_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!("Greeted {} time(s)!", greeting_account.counter);

    Ok(())
}

// Sanity tests
/*
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        let mut data = vec![0; mem::size_of::<u32>()];
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        let instruction_data: Vec<u8> = Vec::new();

        let accounts = vec![account];

        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            0
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            1
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            2
        );
    }
}
*/

