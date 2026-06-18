const MAX_WISH_LENGTH = 200;

function normalizeWishContent(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function validateWishContent(value) {
  const content = normalizeWishContent(value);

  if (!content) {
    return {
      valid: false,
      message: '先写下一句话吧。'
    };
  }

  if (content.length > MAX_WISH_LENGTH) {
    return {
      valid: false,
      message: '星空一次只能收藏 200 个字。'
    };
  }

  return {
    valid: true,
    content
  };
}

module.exports = {
  MAX_WISH_LENGTH,
  normalizeWishContent,
  validateWishContent
};
