import { Router } from "express";
import { loginUser,logOutUser, registerUser,refreshAccessToken,updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser)

//secured routes
router.route("/updateAvatar").post(
    verifyJWT,
    upload.single("avatar"),  // single takes only string name no object
    updateUserAvatar);

router.route("/updateCoverImage").post(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
);

router.route("/logout").post(verifyJWT,logOutUser);
router.route("/refresh-token").post(refreshAccessToken);
export default router;