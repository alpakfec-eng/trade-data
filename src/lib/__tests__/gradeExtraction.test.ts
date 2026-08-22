import { extractGrade, parseIGMDate, cleanFieldValue } from '../gradeExtraction';

describe('extractGrade', () => {
  describe('Example descriptions from requirements', () => {
    it('should extract identical normalizedGrade from first example', () => {
      const desc1 = 'LINEAR LOW DENSITY POLYETHYLENE (LLDPE), BRAND: LOTRENE, GRADE: Q1018H 2512QT015 24086, PACKED IN 25 KGS P BAGS, NET WEIGHT 25500 KGS APPROX, BRAND: LOTRENE, ORIGIN: QATAR,';
      const result = extractGrade(desc1);
      
      expect(result.polymerType).toBe('LLDPE');
      expect(result.gradeCode).toBe('Q1018H');
      expect(result.normalizedGrade).toBe('LLDPE Q1018H');
      expect(result.confidence).toBe('high');
    });
    
    it('should extract identical normalizedGrade from second example', () => {
      const desc2 = 'LINEAR LOW DENSITY POLYETHYLENE (LLDPE) "LOTRENE" Q1018H (DECLARE INVOICE VALUE HIGHTER THAN SCAN PRICE)';
      const result = extractGrade(desc2);
      
      expect(result.polymerType).toBe('LLDPE');
      expect(result.gradeCode).toBe('Q1018H');
      expect(result.normalizedGrade).toBe('LLDPE Q1018H');
      expect(result.confidence).toBe('high');
    });
  });
  
  describe('LDPE samples from real data', () => {
    it('should extract from LOW DENSITY POLY ETHYLENE LDPE 722', () => {
      const desc = 'LOW DENSITY POLY ETHYLENE LDPE 722';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('LDPE');
      expect(result.gradeCode).toBe('722');
      expect(result.normalizedGrade).toBe('LDPE 722');
      expect(result.confidence).toBe('medium');
    });
    
    it('should extract from PLASTIC MOULDING COMPOUND LOW DENSITY POLYETHYLENE LDPE-2426H', () => {
      const desc = 'PLASTIC MOULDING COMPOUND LOW DENSITY POLYETHYLENE LDPE-2426H (GD FILED AS PER SCAN PRICE OF LC DATE SERIAL NO 1 COLUMN NO 4 @ USD 1715/MT)';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('LDPE');
      expect(result.gradeCode).toBe('2426H');
      expect(result.normalizedGrade).toBe('LDPE 2426H');
    });
    
    it('should extract from LOW DENSITY POLYETHYLENE GRADE: 2420D', () => {
      const desc = 'LOW DENSITY POLYETHYLENE GRADE: 2420D, PACKED IN PP BAGS, NET WEIGHT: 28000 KGS APPROX, Brand: KUNLUN, ORIGIN: NOT SHOWN,';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('LDPE');
      expect(result.gradeCode).toBe('2420D');
      expect(result.normalizedGrade).toBe('LDPE 2420D');
      expect(result.confidence).toBe('high');
    });
  });
  
  describe('HDPE samples', () => {
    it('should extract HDPE grade codes', () => {
      const desc = 'HIGH DENSITY POLYETHYLENE HDPE GRADE: HP4024WN, ORIGIN: SAUDI ARABIA';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('HDPE');
      expect(result.gradeCode).toBe('HP4024WN');
      expect(result.normalizedGrade).toBe('HDPE HP4024WN');
      expect(result.confidence).toBe('high');
    });
  });
  
  describe('PP samples', () => {
    it('should extract PP grade codes', () => {
      const desc = 'POLYPROPYLENE PP GRADE NO: 119ZJ, BRAND: SABIC';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('PP');
      expect(result.gradeCode).toBe('119ZJ');
      expect(result.normalizedGrade).toBe('PP 119ZJ');
      expect(result.confidence).toBe('high');
    });
  });
  
  describe('Edge cases', () => {
    it('should return low confidence for description with no grade code', () => {
      const desc = 'POLYPROPYLENE PACKED IN BAGS';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('PP');
      expect(result.gradeCode).toBeNull();
      expect(result.normalizedGrade).toBeNull();
      expect(result.confidence).toBe('low');
    });
    
    it('should return low confidence for description with no polymer type', () => {
      const desc = 'PLASTIC PELLETS Q1018H';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBeNull();
      expect(result.gradeCode).toBe('Q1018H');
      expect(result.normalizedGrade).toBeNull();
      expect(result.confidence).toBe('medium');
    });
    
    it('should handle null/undefined input', () => {
      expect(extractGrade(null as any)).toEqual({
        polymerType: null,
        gradeCode: null,
        normalizedGrade: null,
        confidence: 'low',
      });
      
      expect(extractGrade(undefined as any)).toEqual({
        polymerType: null,
        gradeCode: null,
        normalizedGrade: null,
        confidence: 'low',
      });
      
      expect(extractGrade('')).toEqual({
        polymerType: null,
        gradeCode: null,
        normalizedGrade: null,
        confidence: 'low',
      });
    });
    
    it('should not confuse weight numbers with grade codes', () => {
      const desc = 'LOW DENSITY POLYETHYLENE 25000 KGS NET WEIGHT';
      const result = extractGrade(desc);
      
      // 25000 is pure number, should be excluded
      expect(result.gradeCode).toBeNull();
    });
    
    it('should not confuse HS codes with grade codes', () => {
      const desc = 'POLYETHYLENE 3901.1000';
      const result = extractGrade(desc);
      
      // 3901.1000 looks like HS code, should be excluded
      expect(result.gradeCode).toBeNull();
    });
    
    it('should prefer explicit GRADE label over other patterns', () => {
      const desc = 'LDPE "BRAND X" Q9999 GRADE: Q1018H';
      const result = extractGrade(desc);
      
      // Should use GRADE: label even though Q9999 appears first
      expect(result.gradeCode).toBe('Q1018H');
      expect(result.confidence).toBe('high');
    });
  });
  
  describe('Real-world messy data', () => {
    it('should handle multi-line descriptions', () => {
      const desc = `LINEAR LOW DENSITY POLYETHYLENE 
        BRAND: LOTRENE
        GRADE: Q1018H
        ORIGIN: QATAR`;
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('LLDPE');
      expect(result.gradeCode).toBe('Q1018H');
    });
    
    it('should handle extra whitespace and special characters', () => {
      const desc = '  LOW   DENSITY  POLYETHYLENE   ( LDPE )  GRADE : 2420D  ';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('LDPE');
      expect(result.gradeCode).toBe('2420D');
    });
    
    it('should extract grade from MDPE description', () => {
      const desc = 'MEDIUM DENSITY POLYETHYLENE MDPE GRADE: 3840UA';
      const result = extractGrade(desc);
      
      expect(result.polymerType).toBe('MDPE');
      expect(result.gradeCode).toBe('3840UA');
      expect(result.normalizedGrade).toBe('MDPE 3840UA');
    });
  });
});

describe('parseIGMDate', () => {
  it('should parse Excel-style float date (YYYYMMDD.0)', () => {
    const result = parseIGMDate('20251205.0');
    expect(result).toEqual(new Date(2025, 11, 5));
  });
  
  it('should parse YYYYMMDD integer', () => {
    const result = parseIGMDate(20250620);
    expect(result).toEqual(new Date(2025, 5, 20));
  });
  
  it('should parse DD-MMM-YY format', () => {
    const result = parseIGMDate('12-Aug-26');
    expect(result).toEqual(new Date(2026, 7, 12));
  });
  
  it('should return null for invalid date', () => {
    expect(parseIGMDate('invalid')).toBeNull();
    expect(parseIGMDate(null)).toBeNull();
    expect(parseIGMDate(undefined)).toBeNull();
  });
});

describe('cleanFieldValue', () => {
  it('should trim whitespace', () => {
    expect(cleanFieldValue('  3901.1000  ')).toBe('3901.1000');
  });
  
  it('should normalize multiple spaces', () => {
    expect(cleanFieldValue('United    States')).toBe('United States');
  });
  
  it('should return null for empty/null values', () => {
    expect(cleanFieldValue('')).toBeNull();
    expect(cleanFieldValue(null)).toBeNull();
    expect(cleanFieldValue(undefined)).toBeNull();
  });
});
