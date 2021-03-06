import User from "../models/User";
import bcrypt from "bcrypt";
import fetch from "node-fetch";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });
export const postJoin = async (req, res) => {
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

export const getLogin = (req, res) =>
	res.render("login", { pageTitle: "Login" });

export const postLogin = async (req, res) => {
	const { username, password } = req.body;
	const pageTitle = "Login";
	const user = await User.findOne({ username, socialOnly: false });
	if (!user) {
		return res.status(400).render("login", {
			pageTitle,
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

export const startGithubLogin = (req, res) => {
	const baseUrl = `https://github.com/login/oauth/authorize?`;
	const config = {
		client_id: process.env.GH_CLIENT,
		allow_signup: false,
		scope: "read:user user:email",
	};
	const params = new URLSearchParams(config).toString();
	const finalUrl = `${baseUrl}${params}`;
	return res.redirect(finalUrl);
};
export const finishGithubLogin = async (req, res) => {
	const baseUrl = "https://github.com/login/oauth/access_token?";
	const config = {
		client_id: process.env.GH_CLIENT,
		client_secret: process.env.GH_SECRET,
		code: req.query.code,
	};
	const params = new URLSearchParams(config).toString();
	const finalUrl = `${baseUrl}${params}`;
	const toekenRequest = await (
		await fetch(finalUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
			},
		})
	).json();
	if ("access_token" in toekenRequest) {
		const { access_token } = toekenRequest;
		const apiUrl = "https://api.github.com";
		const userData = await (
			await fetch(`${apiUrl}/user`, {
				headers: {
					Authorization: `token ${access_token}`,
				},
			})
		).json();
		console.log("UserData -------", userData);

		const emailData = await (
			await fetch(`${apiUrl}/user/emails`, {
				headers: {
					Authorization: `token ${access_token}`,
				},
			})
		).json();

		const emailObj = emailData.find(
			(email) => email.primary === true && email.verified === true,
		);
		if (!emailObj) {
			return res.redirect("/login");
		}
		console.log("Let's check the email first", emailObj.email);
		let user = await User.findOne({ email: emailObj.email });
		if (!user) {
			user = await User.create({
				name: userData.name,
				username: userData.login,
				email: emailObj.email,
				password: "",
				socialOnly: true,
				location: userData.location,
				avatarUrl: userData.avatar_url,
			});
		}
		req.session.loggedIn = true;
		req.session.user = user;
		return res.redirect("/");
		//if we don't have an account with this email, we will create an account
	} else {
		return res.redirect("/login");
		//sending notification
	}
};

export const logout = (req, res) => {
	req.session.destroy();
	return res.redirect("/");
};

export const getEdit = (req, res) =>
	res.render("edit-profile", { pageTitle: "Edit Profile" });

export const postEdit = async (req, res) => {
	const {
		session: {
			user: { _id, avatarUrl },
		},
		body: { name, email, username, location },
		file,
	} = req;
	console.log("file", file, "avatarUrl", avatarUrl);

	const updatedUser = await User.findByIdAndUpdate(
		_id,
		{
			avatarUrl: file ? file.path : avatarUrl,
			name,
			email,
			username,
			location,
		},
		{ new: true },
	);
	req.session.user = updatedUser;
	return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
	if (req.session.user.socialOnly === true) {
		return res.redirect("/");
	}
	res.render("users/change-password", { pageTitle: "Change Password" });
};

export const postChangePassword = async (req, res) => {
	const {
		session: {
			user: { _id, password },
		},
		body: { oldPassword, newPassword, newPassword2 },
	} = req;
	const ok = await bcrypt.compare(oldPassword, password);
	if (!ok) {
		return res.status(400).render("users/change-password", {
			pageTitle: "Change Password",
			errorMessage: "The old password is incorrect.",
		});
	}
	if (newPassword !== newPassword2) {
		return res.status(400).render("users/change-password", {
			pageTitle: "Change Password",
			errorMessage: "The password confirmation doesn't match",
		});
	}
	const user = await User.findById(_id);
	user.password = newPassword;
	await user.save(); // trigger userSchema.pre("save") to hash passowrd
	req.session.user = {
		...req.session.user,
		password,
	};
	console.log(newPassword, "---", user.password);
	return res.redirect("/users/logout");
};

export const see = async (req, res) => {
	const { id } = req.params;
	const user = await User.findById(id).populate("videos");
	if (!user) {
		res.status(404).render("404", { pageTitle: "We cannot find this user" });
	}
	return res.render("users/profile", {
		pageTitle: `${user.name}'s Profile`,
		user,
	});
};
