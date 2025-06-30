import dotenv from "dotenv";
import DB_Connection from "./db/index.js";
import app from "./app.js"


dotenv.config({
    path: './env'
})

DB_Connection().then(()=>{

    app.on("Error int the DB ", (err)=>{
        console.log("error of running in db connection ",err);
        
    })

    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is runnig on ${process.env.PORT}`);
        
    })

}).catch((err)=>{
    console.log(`error in db conncetion ${err} `);
    
})










/*
import express from "express";
const app = express();
( async  ()=>{
    try {

       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
       app.on("error", (error)=>{
        console.log("error",error);
        throw error
        
       })

       app.listen(process.env.PORT, ()=>{
            console.log(`app is listing on ${process.env.PORT}`);
            
       })
        
    } 
    catch (error) {
        console.log(`errror${error}`);
        throw error;  
    }

})()
*/    