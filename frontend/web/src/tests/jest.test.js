function isEven(number) {
    return number % 2 === 0;
  }
  
  describe('isEven functie', () => {
    test('controleert of 2 even is', () => {
      expect(isEven(2)).toBe(true);
    });
  
    test('controleert of 3 oneven is', () => {
      expect(isEven(3)).toBe(false);
    });
  
    test('controleert of 0 even is', () => {
      expect(isEven(0)).toBe(true);
    });
  
    test('controleert of -2 even is', () => {
      expect(isEven(-2)).toBe(true);
    });
  
    test('controleert of -3 oneven is', () => {
      expect(isEven(-3)).toBe(false);
    });
  });
  
  module.exports = isEven;