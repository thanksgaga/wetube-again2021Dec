import User from "../models/User";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });
export const postJoin = async (req, res) => {
	console.log(req.body);
	const { name, username, email, password, password2, location } = req.body;
	const pageTitle = "Join";

	if (password !== password2) {
		return res.status(400).render("join", {
			pageTitle,
			errorMessage: "Password confirmation doesn't match",
		});
	}
	const exists = await User.exists({ $or: [{ username }, { email }] });
	if (exists) {
		return res.status(400).render("join", {
			pageTitle,
			errorMessage: "This username/email is already taken",
		});
	}
	try {
		await User.create({
			name,
			username,
			email,
			password,
			location,
		});
		return res.redirect("/login");
	} catch (error) {
		return res
			.status(400)
			.render("join", { pageTitle, errorMessage: error._message });
	}
};

export const edit = (req, res) => res.send("Edit User");
export const remove = (req, res) => res.send("Remove User");
export const getLogin = (req, res) =>
	res.render("login", { pageTitle: "Login" });

export const postLogin = async (req, res) => {
	const { username, password } = req.body;
	const pageTitle = "Login";
	const user = await User.findOne({ username });
	if (!user) {
		return res.status(400).render("login", {
			ppageTitle,
			errorMessage: "An account with this username does not exist.",
		});
	}
	const ok = await bcrypt.compare(password, user.password);
	if (!ok) {
		return res.status(400).render("login", {
			pageTitle,
			errorMessage: "Wrong password.",
		});
	}
	//adding information to the session.
	//Every browser will have different info
	req.session.loggedIn = true;
	req.session.user = user;
	console.log("LOG USER IN! Coming soon");

	//check if account exists
	//check if password correct
	return res.redirect("/");
};

export const logout = (req, res) => res.send("Log out");
export const see = (req, res) => res.send("See User");
