export class Type {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }

  validateInput(value) {
    if (this.type === Buffer) {
      return Buffer.isBuffer(value) || typeof value === 'string';
    }
    if (this.type === Number) {
      return typeof value === 'number' || !isNaN(parseInt(value, 10));
    }
    if (this.type === String) {
      return typeof value === 'string';
    }
    return true;
  }

  toString() {
    return `${this.name}<${this.type.name}>`;
  }
}

export class IdType extends Type {
  constructor() {
    super('id', Number);
  }
}

export class PriorityType extends Type {
  constructor() {
    super('priority', Number);
  }
}

export class DelayType extends Type {
  constructor() {
    super('delay', Number);
  }
}

export class TubeType extends Type {
  constructor() {
    super('tube', String);
  }
}

export class BodyType extends Type {
  constructor() {
    super('body', Buffer);
  }
}

export class YamlBodyType extends Type {
  constructor() {
    super('body', Object);
  }
}

export class IgnoreType {

}
