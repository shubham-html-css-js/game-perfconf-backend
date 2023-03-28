const {MongoClient}=require('mongodb');
let dbConnection
module.exports={
    connectToDb:(cb)=>{
        MongoClient.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_KEY}@cluster0.ulpa2.mongodb.net/?retryWrites=true&w=majority`)
        .then((client)=>{
            dbConnection=client.db()
            return cb();
        })
        .catch(err=>{
            console.log(err)
            return cb(err);        
       });
    },
    getDb:()=>{
        return dbConnection;
    }
}
