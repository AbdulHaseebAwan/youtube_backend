import mongoose from "mongoose";
import { DB_NAME } from "../consonants.js";

const DB_Connection = async()=>{

try {

 const connectionInstance = await   mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
 console.log(`database is connected and hosted on ${connectionInstance.connection.host}`);
 
    
} catch (error) {

    console.log(`error${error}`);
    process.exit(1);
    
    
}

}

export default DB_Connection