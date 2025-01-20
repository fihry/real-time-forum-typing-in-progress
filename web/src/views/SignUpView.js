import AbstractView from "./AbstractView.js";
import redirect from "../index.js";
import fetcher from "../pkg/fetcher.js";

const signup = async (email, nickname, password, firstName, lastName, age, gander, rePassword) => {
  let body = {
    nickname: nickname,
    email: email,
    password: password,
    firstName: firstName,
    lastName: lastName,
    age: Number(age),
    gander: gander,
    cfmpsw: rePassword,
  };
  console.log(body);
  const data = await fetcher.post("/api/signup", body);
  if (data && data.msg !== undefined) {
    let showErr = document.getElementById("showError");
    showErr.innerHTML = data.msg;
    return;
  }
  redirect.navigateTo("/sign-in");
};

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Sign Up");
  }

  async getHtml() {
    return `
        <div class="auth-wrapper">
          <form id="sign-up-form" class="auth-form">
            <h2 class="form-title">Create Your Account</h2>
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                class="form-control"
                placeholder="Enter your first name"
                required
              >
              <div class="validation-message" id="firstName-error"></div>
            </div>

            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                class="form-control"
                placeholder="Enter your last name"
                required
              >
              <div class="validation-message" id="lastName-error"></div>
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                type="email"
                id="email"
                class="form-control"
                placeholder="Enter your email"
                required
              >
              <div class="validation-message" id="email-error"></div>
            </div>

            <div class="form-group">
              <label for="nikname">Nickname</label>
              <input
                type="text"
                id="nikname"
                class="form-control"
                placeholder="Choose a nickname"
                required
                minlength="3"
                maxlength="20"
              >
              <div class="validation-message" id="nikname-error"></div>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                class="form-control"
                placeholder="Create a password"
                required
                minlength="6"
              >
              <div class="validation-message" id="password-error"></div>
            </div>

            <div class="form-group">
              <label for="rePassword">Confirm Password</label>
              <input
                type="password"
                id="rePassword"
                class="form-control"
                placeholder="Repeat your password"
                required
              >
              <div class="validation-message" id="rePassword-error"></div>
            </div>



            <div class="form-group">
              <label for="age">Age</label>
              <input
                type="number"
                id="age"
                class="form-control"
                placeholder="Enter your age"
                required
              >
              <div class="validation-message" id="age-error"></div>
            </div>

            <div class="form-group">
              <label for="gander">Gender</label>
              <select id="gander" class="form-control" required>
                <option value="">Select your gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <div class="validation-message" id="gander-error"></div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Sign Up</button>
            </div>

            <div class="form-footer">
              <p>
                Already have an account?
                <a href="/sign-in" data-link>Sign In</a>
              </p>
                <a href="/" data-link>Go Home</a>
            </div>

            <div id="showError" class="error-message"></div>
          </form>
        </div>
      `;
  }

  async init() {
    const signUpForm = document.getElementById("sign-up-form");

    // Input elements
    const emailInput = document.getElementById("email");
    const niknameInput = document.getElementById("nikname");
    const passwordInput = document.getElementById("password");
    const rePasswordInput = document.getElementById("rePassword");
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const ageInput = document.getElementById("age");
    const ganderInput = document.getElementById("gander");

    // Error message elements
    const emailError = document.getElementById("email-error");
    const niknameError = document.getElementById("nikname-error");
    const passwordError = document.getElementById("password-error");
    const rePasswordError = document.getElementById("rePassword-error");
    const firstNameError = document.getElementById("firstName-error");
    const lastNameError = document.getElementById("lastName-error");
    const ageError = document.getElementById("age-error");
    const ganderError = document.getElementById("gander-error");

    // Email validation
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        emailError.textContent = "Email is required";
        return false;
      }
      if (!emailRegex.test(email)) {
        emailError.textContent = "Please enter a valid email address";
        return false;
      }
      emailError.textContent = "";
      return true;
    };

    // nikname validation
    const validatenikname = (nikname) => {
      if (!nikname) {
        niknameError.textContent = "nikname is required";
        return false;
      }
      if (nikname.length < 3) {
        niknameError.textContent =
          "nikname must be at least 3 characters long";
        return false;
      }
      if (nikname.length > 20) {
        niknameError.textContent = "nikname must be less than 20 characters";
        return false;
      }
      niknameError.textContent = "";
      return true;
    };

    // Password validation
    const validatePassword = (password) => {
      if (!password) {
        passwordError.textContent = "Password is required";
        return false;
      }
      if (password.length < 6) {
        passwordError.textContent =
          "Password must be at least 6 characters long";
        return false;
      }
      passwordError.textContent = "";
      return true;
    };

    // Confirm password validation
    const validateConfirmPassword = (password, confirmPassword) => {
      if (!confirmPassword) {
        rePasswordError.textContent = "Please confirm your password";
        return false;
      }
      if (password !== confirmPassword) {
        rePasswordError.textContent = "Passwords do not match";
        return false;
      }
      rePasswordError.textContent = "";
      return true;
    };

    // First name validation
    const validateFirstName = (firstName) => {
      if (!firstName) {
        firstNameError.textContent = "First name is required";
        return false;
      }
      firstNameError.textContent = "";
      return true;
    };

    // Last name validation
    const validateLastName = (lastName) => {
      if (!lastName) {
        lastNameError.textContent = "Last name is required";
        return false;
      }
      lastNameError.textContent = "";
      return true;
    };

    // Age validation
    const validateAge = (age) => {
      if (!age) {
        ageError.textContent = "Age is required";
        return false;
      }
      if (isNaN(age) || age <= 0) {
        ageError.textContent = "Please enter a valid age";
        return false;
      }
      ageError.textContent = "";
      return true;
    };

    // Gender validation
    const validateGander = (gander) => {
      if (!gander) {
        ganderError.textContent = "Gender is required";
        return false;
      }
      ganderError.textContent = "";
      return true;
    };

    // Real-time validation
    emailInput.addEventListener("input", () => validateEmail(emailInput.value));
    niknameInput.addEventListener("input", () =>
      validatenikname(niknameInput.value)
    );
    passwordInput.addEventListener("input", () =>
      validatePassword(passwordInput.value)
    );
    rePasswordInput.addEventListener("input", () =>
      validateConfirmPassword(passwordInput.value, rePasswordInput.value)
    );
    firstNameInput.addEventListener("input", () =>
      validateFirstName(firstNameInput.value)
    );
    lastNameInput.addEventListener("input", () =>
      validateLastName(lastNameInput.value)
    );
    ageInput.addEventListener("input", () => validateAge(ageInput.value));
    ganderInput.addEventListener("change", () => validateGander(ganderInput.value));

    // Form submission
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Validate all fields
      const isEmailValid = validateEmail(emailInput.value);
      const isniknameValid = validatenikname(niknameInput.value);
      const isPasswordValid = validatePassword(passwordInput.value);
      const isConfirmPasswordValid = validateConfirmPassword(
        passwordInput.value,
        rePasswordInput.value
      );
      const isFirstNameValid = validateFirstName(firstNameInput.value);
      const isLastNameValid = validateLastName(lastNameInput.value);
      const isAgeValid = validateAge(ageInput.value);
      const isGanderValid = validateGander(ganderInput.value);

      // Only proceed if all validations pass
      if (
        isEmailValid &&
        isniknameValid &&
        isPasswordValid &&
        isConfirmPasswordValid &&
        isFirstNameValid &&
        isLastNameValid &&
        isAgeValid &&
        isGanderValid
      ) {
        await signup(
          emailInput.value,
          niknameInput.value,
          passwordInput.value,
          firstNameInput.value,
          lastNameInput.value,
          ageInput.value,
          ganderInput.value,
          rePasswordInput.value
        );
      }
    });
  }
}
