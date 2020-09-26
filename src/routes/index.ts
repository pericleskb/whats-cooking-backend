import * as express from "express"
import * as bodyParser from "body-parser"
import mongoClient from "mongodb"
import { env } from "process"
import Recipe from "../models/recipe"
import DbVariables from "../models/dbVariable"
import mongoose from "mongoose"

export const register =   (app: express.Application) => {
  const envVar = process.env;
  let dataVersion = 0;
  let db : mongoClient.Db;

  mongoose.connect(envVar.DATABASE_URL, {useNewUrlParser: true})

  mongoClient.connect(envVar.DATABASE_URL)
    .then (async client => {
      console.log(`Connection to database established`)
      db = client.db(envVar.DB_NAME)

      let cursor = db.listCollections({name: envVar.VARIABLES_COLLECTION})
      if (!await cursor.hasNext()) {
        const dataVersionVar = new DbVariables();
        dataVersionVar.name = "data_version"
        dataVersionVar.value = dataVersion;
        dataVersionVar.save();
      } else {
         DbVariables.findOne({name: "data_version"})
         .then (doc => {
           dataVersion = doc.value.valueOf()
         })
         .catch (err => {
           console.log("Did not find data version variable. Set to 0")
         })
      }

      cursor =  db.listCollections({name: 'recipe_details_view'})
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
    const recipe = new Recipe(req.body)
    recipe.dataVersion = dataVersion
    recipe.save()
    .then (async savedRecipe => {
      res.status(200)
      await DbVariables.updateOne({name: "data_version"}, {value: ++dataVersion})
    })
    .catch (err => {
      if (err.code === 11000) {
        console.error("Tried to add recipe with existing title")
        res.json({error: "Recipe name already exists"})
      } else {
      console.error(err)
      res.json( {error: err.message || err })
      }
    })
  })

  app.get(`/recipeDetails/:recipeName/`, async (req, res) => {
    const query = {title: req.params.recipeName}
    db.collection('recipe_details_view').findOne(query)
    .then (result => res.send(result))
    .catch (err => {
      console.error(err)
      res.json( {error: err.message || err })
    })
  })

  app.get(`/recipeInstructions/:recipeName/`, async (req, res) => {
    const query = {title: req.params.recipeName}
    db.collection('recipe_instructions_view').findOne(query)
    .then (result => res.send(result))
    .catch (err => {
      console.error(err)
      res.json( {error: err.message || err })
    })
  })

  app.get(`/recipeDetails/`, async (req, res) => {
    db.collection('recipe_details_view').find().toArray()
    .then( array => {
      res.setHeader("data_version", dataVersion)
      res.send(array)
    })
    .catch(err => {
      console.log(err)
      res.status(500).send()
    })
  })

  // Getting recipe details in increments
  // app.get(`/recipeDetails/from/:from/to/:to/`, async (req, res) => {
  //   if (!isNaN(+req.params.from) && !isNaN(+req.params.to)) {
  //     db.collection('recipe_details_view').find().toArray()
  //     .then( array => {
  //       res.send(array.slice(+req.params.from, +req.params.to))
  //     })
  //     .catch(err => {
  //       console.log(err)
  //       res.status(500).send()
  //     })
  //   } else {
  //     res.status(400).send("Route parameters must be numbers")
  //   }
  // })
}