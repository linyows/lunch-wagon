module.exports = {
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 3,
  },
  "env": {
    "node": true
  },
  "rules": {
    "max-len": ["error", {"code": 160}],
    "camelcase": "off",
    "no-var": "off",
    "no-unused-vars": "off",
    "indent": [ "error", 2 ],
    "linebreak-style": [ "error", "unix" ],
    "quotes": [ "error", "single" ],
    "semi": [ "error", "never" ]
  }
};
