import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";

export {Router} from "express"

const router = Router()

router.route("/register").post(

    //middleware injected which is multer
    upload.fields(
        [
            {
                name: "avator",
                maxCount: 1
            },
            {
                 name: "coverImage",
                 maxCount: 1
            }
        ]
    ),
    registerUser
)

export default router