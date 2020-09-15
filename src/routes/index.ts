import * as express from "express"
import * as bodyParser from "body-parser"
import mongoClient from "mongodb"
import { env } from "process"

export const register =   (app: express.Application) => {
  const dbUrl = process.env.DATABASE_URL
  const envVar = process.env;

  let db : mongoClient.Db;
  mongoClient.connect(envVar.DATABASE_URL)
    .then (client => {
    // tslint:disable-next-line:no-console
    console.log(`Connection to database established`)
    db = client.db(envVar.DB_NAME)
    db.listCollections({name: 'recipe_details_view'})
      .next((err, collumnInfo) => {
        if (!collumnInfo) {
          db.createCollection('recipe_details_view', {
            viewOn: env.RECIPES_COLLECTION,
            pipeline: [{$project: {'title': 1}}]
          })
        }
      })
  })
  .catch(error => {
      console.error(error)
      process.exit(999)
    })

  app.use(bodyParser.json())

  app.post('/recipe/add/', async (req, res) => {
    try {
      db.collection(envVar.RECIPES_COLLECTION).insertOne(req.body)
      res.status(200)
    } catch (err) {
      console.error(err)
      res.json( {error: err.message || err })
    }
  })

  app.get(`/recipeDetails/:recipeName`, async (req, res) => {
    try {
       const query = {title: req.params.recipeName}
      const result = await db.collection('recipe_details_view').findOne(query)
      console.log(result)
      res.send(result)
    } catch (err) {
      console.error(err)
      res.json( {error: err.message || err })
    }
  })

  app.post('/recipesInstructions', (req, res) => {
      res.send('Got a POST request')
  })
}