import multer from "multer";

export const localsMiddleware = (req, res, next) => {
	res.locals.loggedIn = Boolean(req.session.loggedIn);
	res.locals.siteName = "Wetube-gaga";
	res.locals.loggedInUser = req.session.user || {};
	console.log(res.locals.loggedInUser);
	next();
};

export const protectorMiddleware = (req, res, next) => {
	if (req.session.loggedIn) {
		next();
	} else {
		res.redirect("/login");
	}
};

export const publicOnlyMiddleware = (req, res, next) => {
	if (!req.session.loggedIn) {
		next();
	} else {
		res.redirect("/");
	}
};

export const uploadFiles = multer({ dest: "uploads/" });
