module.exports = {
  "extends": "google"
  , "parserOptions": {
    "ecmaVersion": 6
    , "sourceType": "module"
  }
  , "rules": {
    "comma-style": ["error", "first"]
    , "one-var": ["error", "always"]
    , "max-len": ["error", {"code":120}]
    , "no-unused-vars": ["error"]
    , "no-warning-comments": 0 // TODO and FIXME are reasonable comments
    , "operator-linebreak": ["error", "before"]
    , "key-spacing": "off"  // forcing colon aligns is janky
    , "no-mixed-requires": "off"
    , "no-multi-spaces": "off"
    , "space-before-function-paren": ["error", {"anonymous": "always", "named": "never"}]
    , "generator-star-spacing": ["error", {"before": false, "after": true}]
    , "camelcase": ["error", {"properties": "never"}]
    , "quotes": "off" // This isn't terribly important.
    , "comma-dangle": "off" // Neither is this.  Commas-first makes this easier to track anyway.
  }
};
