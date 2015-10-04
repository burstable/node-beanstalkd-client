export class Type {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }

  validateInput(value) {
    if (value) {
      return true;
    }
    return true;
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
