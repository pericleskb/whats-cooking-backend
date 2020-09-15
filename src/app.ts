import express from "express"
import dotnev from "dotenv"
import * as routes from "./routes"

const app = express()

dotnev.config()

const port = process.env.SERVER_PORT

routes.register(app)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


