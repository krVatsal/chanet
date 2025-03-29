import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

let dbConnect= async ()=>{
try {
    //   await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
      await mongoose.connect(process.env.DATABASE)
       console.log("Server connected to Database successfully")
    } catch (error) {
        console.log("Error connecting the database")
       
       process.exit(1)
    }

}   
  export default dbConnect;