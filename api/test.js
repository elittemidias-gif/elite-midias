module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    has_token: !!process.env.MP_ACCESS_TOKEN,
    token_length: process.env.MP_ACCESS_TOKEN?.length || 0,
    token_start: process.env.MP_ACCESS_TOKEN?.substring(0, 10) || 'empty'
  });
};
