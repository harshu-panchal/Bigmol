import { MongoClient } from 'mongodb';

const oldUri = "mongodb+srv://playeronline4076_db_user:7wsF0h4FK2IJVIC5@multivendor.tk3zgp9.mongodb.net/?appName=Multivendor";
const newUri = "mongodb+srv://BigMol:BigMol@cluster0.9z6fko1.mongodb.net/?appName=Cluster0";

async function migrate() {
    let oldClient, newClient;
    try {
        console.log("Connecting to old database...");
        oldClient = await MongoClient.connect(oldUri, { useNewUrlParser: true, useUnifiedTopology: true });
        const oldDb = oldClient.db(); 
        console.log(`Connected to old database: ${oldDb.databaseName}`);

        console.log("Connecting to new database...");
        newClient = await MongoClient.connect(newUri, { useNewUrlParser: true, useUnifiedTopology: true });
        const newDb = newClient.db();
        console.log(`Connected to new database: ${newDb.databaseName}`);

        console.log("Fetching collections from old database...");
        const collections = await oldDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections.`);

        for (const info of collections) {
            if (info.name === 'system.views' || info.name.startsWith('system.')) continue;
            console.log(`\nMigrating collection: ${info.name}...`);
            
            const oldCollection = oldDb.collection(info.name);
            const newCollection = newDb.collection(info.name);
            
            // Fetch all documents
            const docs = await oldCollection.find({}).toArray();
            if (docs.length > 0) {
                // Drop new collection first to avoid duplicates
                try {
                    await newCollection.drop();
                } catch (e) {
                    // Ignore drop error if collection didn't exist
                }
                
                // Insert documents
                await newCollection.insertMany(docs);
                console.log(`[+] Migrated ${docs.length} documents for '${info.name}'.`);
            } else {
                console.log(`[-] Skipped '${info.name}': No documents found.`);
            }
        }

        console.log("\n✅ Migration completed successfully.");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        if (oldClient) await oldClient.close();
        if (newClient) await newClient.close();
    }
}

migrate();
