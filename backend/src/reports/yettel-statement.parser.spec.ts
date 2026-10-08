import { parseAmount, parseYettelStatement, StatementParseError } from './yettel-statement.parser';

/**
 * Synthetic statement in the shape pdf-parse produces for Yettel Bank PDFs
 * (dates and amounts glued together, page furniture in between rows).
 * Names and numbers are made up.
 */
export const SAMPLE_STATEMENT = `
IZVOD
Štampano: 10.07.2026
Ime, ime roditelja i prezime:
Pera Petar Perić
Broj računa: 115000000001234567
Izvod po valuti: RSD
Promet za period:01.06.2026 - 30.06.2026
Raspoloživa sredstva: 63.500,00
Kamatna stopa na nedozvoljeno prekoračenje:18.00 %
Kamatna stopa na pozitivno stanje: 0.00 %

Rb.Opis transakcijeDat. knjiženjaDat. valuteIsplataUplataStanje
Prethodno stanje


01.06.202601.06.20260,0010.000,0010.000,00
Izvršeni nalozi
1ACME VENTURES, KNEZ MIHAILOVA 1, BEOGRAD
STARI GRAD
Ref. [00000000000001]
01.06.202601.06.20260,00200.000,00210.000,00
2GooglePay LIDL 174 NOVI SAD, NOVI SAD
Ref. [00000000000002]
02.06.202601.06.20261.234,560,00208.765,44
3Netflix.com, Los Gatos Kurs: 122.0000
Ref. [00000000000003] Originalni iznos : 5,00 Originalna valuta : EUR
03.06.202602.06.2026610,000,00208.155,44

 Multivalutni račun - rezidenti

Datum izvoda: 30.06.2026
Izvod broj: 118
1od2
Yettel Bank ad Beograd
Omladinskih brigada 88
11070 Novi Beograd
4GooglePay 213 - MAXI 217, NOVI SAD
Ref. [00000000000004]
05.06.202605.06.2026655,440,00207.500,00
5Interni transfer - Isplata TR
Ref. [00000000000005]
10.06.202610.06.2026144.000,000,0063.500,00
Novo stanje


30.06.202630.06.2026146.500,00200.000,0063.500,00

 Multivalutni račun - rezidenti

Broj računa: 9110000001111
Izvod po valuti: RSD
Promet za period:01.06.2026 - 30.06.2026
Primenjena NKS: konformna 2.01 %

Rb.Opis transakcijeDat. knjiženjaDat. valuteIsplataUplataStanje
Prethodno stanje


01.06.202601.06.20260,0050.000,0050.000,00
Izvršeni nalozi
1Interni transfer
Ref. [00000000000006]
10.06.202610.06.20260,00144.000,00194.000,00
2Kamata - dinarska štednja
Ref. [00000000000007]
30.06.202630.06.20260,00250,00194.250,00
Novo stanje


30.06.202630.06.20260,00144.250,00194.250,00

 Dinarska štednja po viđenju
2od2
`;

describe('parseAmount', () => {
  it('reads Serbian number format', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('0,00')).toBe(0);
    expect(parseAmount('-12.500,10')).toBe(-12500.1);
  });
});

describe('parseYettelStatement', () => {
  const statement = parseYettelStatement(SAMPLE_STATEMENT);

  it('reads the statement header', () => {
    expect(statement.period).toBe('2026-06');
    expect(statement.statementNo).toBe(118);
    expect(statement.periodStart).toBe('2026-06-01');
    expect(statement.periodEnd).toBe('2026-06-30');
  });

  it('reads every account section with balances and interest rates', () => {
    expect(statement.accounts).toEqual([
      expect.objectContaining({
        accountNo: '115000000001234567',
        kind: 'current',
        currency: 'RSD',
        interestRate: 0,
        openingBalance: 10000,
        closingBalance: 63500
      }),
      expect.objectContaining({
        accountNo: '9110000001111',
        kind: 'savings',
        currency: 'RSD',
        label: 'Dinarska štednja po viđenju',
        interestRate: 2.01,
        openingBalance: 50000,
        closingBalance: 194250
      })
    ]);
  });

  it('splits glued amounts and keeps rows across page breaks', () => {
    const current = statement.transactions.filter(tx => tx.accountNo === '115000000001234567');
    expect(current.map(tx => tx.rowNo)).toEqual([1, 2, 3, 4, 5]);
    expect(current[1]).toEqual(
      expect.objectContaining({
        bookingDate: '2026-06-02',
        valueDate: '2026-06-01',
        debit: 1234.56,
        credit: 0,
        balanceAfter: 208765.44,
        ref: '00000000000002'
      })
    );
  });

  it('joins wrapped descriptions and does not swallow page furniture', () => {
    const [salary, , , maxi] = statement.transactions;
    expect(salary.description).toBe('ACME VENTURES, KNEZ MIHAILOVA 1, BEOGRAD STARI GRAD');
    // the description itself starts with digits ("213 - MAXI")
    expect(maxi.description).toBe('GooglePay 213 - MAXI 217, NOVI SAD');
  });

  it('reads the original amount of foreign-currency card payments', () => {
    const netflix = statement.transactions[2];
    expect(netflix.originalAmount).toBe(5);
    expect(netflix.originalCurrency).toBe('EUR');
  });

  it('gives every row a stable id', () => {
    expect(statement.transactions[0].id).toBe('2026-06:115000000001234567:RSD:1');
    expect(new Set(statement.transactions.map(tx => tx.id)).size).toBe(statement.transactions.length);
  });

  it('rejects a statement whose rows do not add up to the printed balance', () => {
    const broken = SAMPLE_STATEMENT.replace('02.06.202601.06.20261.234,560,00208.765,44', '02.06.202601.06.20261.234,560,00208.700,00');
    expect(() => parseYettelStatement(broken)).toThrow(StatementParseError);
    expect(() => parseYettelStatement(broken)).toThrow(/red 2/);
  });

  it('rejects other documents', () => {
    expect(() => parseYettelStatement('LABORATORIJSKI IZVEŠTAJ')).toThrow(StatementParseError);
  });

  it('rejects statements that do not cover exactly one month', () => {
    const partial = SAMPLE_STATEMENT.replace(/01\.06\.2026 - 30\.06\.2026/g, '01.06.2026 - 15.06.2026');
    expect(() => parseYettelStatement(partial)).toThrow(/ceo jedan mesec/);
  });
});
