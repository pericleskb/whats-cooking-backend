import * as express from "express"
import * as bodyParser from "body-parser"
import mongoClient from "mongodb"
import { env } from "process"
import { isNumber } from "util"

export const register =   (app: express.Application) => {
  const dbUrl = process.env.DATABASE_URL
  const envVar = process.env;

  let db : mongoClient.Db;
  mongoClient.connect(envVar.DATABASE_URL)
    .then (async client => {
      console.log(`Connection to database established`)
      db = client.db(envVar.DB_NAME)

      let cursor =  db.listCollections({name: 'recipe_details_view'})
      if (!await cursor.hasNext()) {
        db.createCollection('recipe_details_view', {
                  viewOn: env.RECIPES_COLLECTION,
                  pipeline: [{$project: {'title': 1, "description" : 1,
                            "difficulty": 1, "imageUri": 1, "servings": 1,
                            "timeInMinutes": 1}}]
                })
      }

      cursor =  db.listCollections({name: 'recipe_instructions_view'})
      if (!await cursor.hasNext()) {
        db.createCollection('recipe_instructions_view', {
                  viewOn: env.RECIPES_COLLECTION,
                  pipeline: [{$project: {'title': 1, 'ingredients': 1, "instructions": 1}}]
                })
      }
    })
  .catch(error => {
      console.error(error)
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

  app.get(`/recipeDetails/:recipeName/`, async (req, res) => {
    try {
      const query = {title: req.params.recipeName}
      const result = await db.collection('recipe_details_view').findOne(query)
      res.send(result)
    } catch (err) {
      console.error(err)
      res.json( {error: err.message || err })
    }
  })

  app.get(`/recipeInstructions/:recipeName/`, async (req, res) => {
    try {
      const query = {title: req.params.recipeName}
      const result = await db.collection('recipe_instructions_view').findOne(query)
      res.send(result)
    } catch (err) {
      console.error(err)
      res.json( {error: err.message || err })
    }
  })

  app.get(`/recipeDetails/from/:from/to/:to/`, async (req, res) => {
    if (!isNaN(+req.params.from) && !isNaN(+req.params.to)) {
      db.collection('recipe_details_view').find().toArray()
      .then( array => {
        res.send(array.slice(+req.params.from, +req.params.to))
      })
      .catch(err => {
        console.log(err)
        res.status(500).send()
      })
    } else {
      res.status(400).send("Route parameters must be numbers")
    }
  })
}