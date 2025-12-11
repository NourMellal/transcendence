const createParser = () => {
    const parser: any = {
        parse: (value: unknown) => value,
    };

    const chainable = () => proxy;
    Object.assign(parser, {
        min: chainable,
        max: chainable,
        uuid: chainable,
        default: chainable,
        optional: chainable,
        email: chainable,
        regex: chainable,
        url: chainable,
        refine: chainable,
        length: chainable,
    });

    const proxy = new Proxy(parser, {
        get(target, prop) {
            if (prop in target) {
                return (target as any)[prop];
            }
            return chainable;
        },
    });

    return proxy;
};

export const z = {
    object: () => createParser(),
    enum: () => createParser(),
    boolean: () => createParser(),
    string: () => createParser(),
    number: () => createParser(),
    coerce: {
        number: () => createParser(),
    },
};

export type ZodType<T = any> = {
    parse: (value: unknown) => T;
};
