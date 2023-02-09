export class TfidfDocument {
  protected frequencies: Map<string, number>;

  constructor(protected tokens: string[], public id: number) {
    this.computeFrequencies();
  }

  protected computeFrequencies() {
    this.frequencies = new Map<string, number>();

    this.tokens.forEach((token: string) => {
      if (this.frequencies.has(token)) {
        return this.frequencies.set(token, this.frequencies.get(token) + 1);
      }

      this.frequencies.set(token, 1);
    });
  }

  getFrequency(token: string): number {
    if (this.frequencies.has(token)) {
      return this.frequencies.get(token);
    }

    return null;
  }

  getUniqueTokens(): string[] {
    return Array.from(this.frequencies.keys());
  }

  public get length(): number {
    return this.tokens.length;
  }
}
