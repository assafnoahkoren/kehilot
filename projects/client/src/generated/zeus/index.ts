/* eslint-disable */

import { AllTypesProps, ReturnTypes, Ops } from './const';
export const HOST = "http://host.docker.internal:8080/v1/graphql"


export const HEADERS = {}
export const apiSubscription = (options: chainOptions) => (query: string) => {
  try {
    const queryString = options[0] + '?query=' + encodeURIComponent(query);
    const wsString = queryString.replace('http', 'ws');
    const host = (options.length > 1 && options[1]?.websocket?.[0]) || wsString;
    const webSocketOptions = options[1]?.websocket || [host];
    const ws = new WebSocket(...webSocketOptions);
    return {
      ws,
      on: (e: (args: any) => void) => {
        ws.onmessage = (event: any) => {
          if (event.data) {
            const parsed = JSON.parse(event.data);
            const data = parsed.data;
            return e(data);
          }
        };
      },
      off: (e: (args: any) => void) => {
        ws.onclose = e;
      },
      error: (e: (args: any) => void) => {
        ws.onerror = e;
      },
      open: (e: () => void) => {
        ws.onopen = e;
      },
    };
  } catch {
    throw new Error('No websockets implemented');
  }
};
const handleFetchResponse = (response: Response): Promise<GraphQLResponse> => {
  if (!response.ok) {
    return new Promise((_, reject) => {
      response
        .text()
        .then((text) => {
          try {
            reject(JSON.parse(text));
          } catch (err) {
            reject(text);
          }
        })
        .catch(reject);
    });
  }
  return response.json() as Promise<GraphQLResponse>;
};

export const apiFetch =
  (options: fetchOptions) =>
  (query: string, variables: Record<string, unknown> = {}) => {
    const fetchOptions = options[1] || {};
    if (fetchOptions.method && fetchOptions.method === 'GET') {
      return fetch(`${options[0]}?query=${encodeURIComponent(query)}`, fetchOptions)
        .then(handleFetchResponse)
        .then((response: GraphQLResponse) => {
          if (response.errors) {
            throw new GraphQLError(response);
          }
          return response.data;
        });
    }
    return fetch(`${options[0]}`, {
      body: JSON.stringify({ query, variables }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...fetchOptions,
    })
      .then(handleFetchResponse)
      .then((response: GraphQLResponse) => {
        if (response.errors) {
          throw new GraphQLError(response);
        }
        return response.data;
      });
  };

export const InternalsBuildQuery = ({
  ops,
  props,
  returns,
  options,
  scalars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  options?: OperationOptions;
  scalars?: ScalarDefinition;
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p = '',
    root = true,
    vars: Array<{ name: string; graphQLType: string }> = [],
  ): string => {
    const keyForPath = purifyGraphQLKey(k);
    const newPath = [p, keyForPath].join(SEPARATOR);
    if (!o) {
      return '';
    }
    if (typeof o === 'boolean' || typeof o === 'number') {
      return k;
    }
    if (typeof o === 'string') {
      return `${k} ${o}`;
    }
    if (Array.isArray(o)) {
      const args = InternalArgsBuilt({
        props,
        returns,
        ops,
        scalars,
        vars,
      })(o[0], newPath);
      return `${ibb(args ? `${k}(${args})` : k, o[1], p, false, vars)}`;
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(`${alias}:${operationName}`, operation, p, false, vars);
        })
        .join('\n');
    }
    const hasOperationName = root && options?.operationName ? ' ' + options.operationName : '';
    const keyForDirectives = o.__directives ?? '';
    const query = `{${Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map((e) => ibb(...e, [p, `field<>${keyForPath}`].join(SEPARATOR), false, vars))
      .join('\n')}}`;
    if (!root) {
      return `${k} ${keyForDirectives}${hasOperationName} ${query}`;
    }
    const varsString = vars.map((v) => `${v.name}: ${v.graphQLType}`).join(', ');
    return `${k} ${keyForDirectives}${hasOperationName}${varsString ? `(${varsString})` : ''} ${query}`;
  };
  return ibb;
};

export const Thunder =
  (fn: FetchFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(
    o: (Z & ValueTypes[R]) | ValueTypes[R],
    ops?: OperationOptions & { variables?: Record<string, unknown> },
  ) =>
    fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
      ops?.variables,
    ).then((data) => {
      if (graphqlOptions?.scalars) {
        return decodeScalarsInResponse({
          response: data,
          initialOp: operation,
          initialZeusQuery: o as VType,
          returns: ReturnTypes,
          scalars: graphqlOptions.scalars,
          ops: Ops,
        });
      }
      return data;
    }) as Promise<InputType<GraphQLTypes[R], Z, SCLR>>;

export const Chain = (...options: chainOptions) => Thunder(apiFetch(options));

export const SubscriptionThunder =
  (fn: SubscriptionFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(
    o: (Z & ValueTypes[R]) | ValueTypes[R],
    ops?: OperationOptions & { variables?: ExtractVariables<Z> },
  ) => {
    const returnedFunction = fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
    ) as SubscriptionToGraphQL<Z, GraphQLTypes[R], SCLR>;
    if (returnedFunction?.on && graphqlOptions?.scalars) {
      const wrapped = returnedFunction.on;
      returnedFunction.on = (fnToCall: (args: InputType<GraphQLTypes[R], Z, SCLR>) => void) =>
        wrapped((data: InputType<GraphQLTypes[R], Z, SCLR>) => {
          if (graphqlOptions?.scalars) {
            return fnToCall(
              decodeScalarsInResponse({
                response: data,
                initialOp: operation,
                initialZeusQuery: o as VType,
                returns: ReturnTypes,
                scalars: graphqlOptions.scalars,
                ops: Ops,
              }),
            );
          }
          return fnToCall(data);
        });
    }
    return returnedFunction;
  };

export const Subscription = (...options: chainOptions) => SubscriptionThunder(apiSubscription(options));
export const Zeus = <
  Z extends ValueTypes[R],
  O extends keyof typeof Ops,
  R extends keyof ValueTypes = GenericOperation<O>,
>(
  operation: O,
  o: (Z & ValueTypes[R]) | ValueTypes[R],
  ops?: {
    operationOptions?: OperationOptions;
    scalars?: ScalarDefinition;
  },
) =>
  InternalsBuildQuery({
    props: AllTypesProps,
    returns: ReturnTypes,
    ops: Ops,
    options: ops?.operationOptions,
    scalars: ops?.scalars,
  })(operation, o as VType);

export const ZeusSelect = <T>() => ((t: unknown) => t) as SelectionFunction<T>;

export const Selector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();

export const TypeFromSelector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();
export const Gql = Chain(HOST, {
  headers: {
    'Content-Type': 'application/json',
    ...HEADERS,
  },
});

export const ZeusScalars = ZeusSelect<ScalarCoders>();

export const decodeScalarsInResponse = <O extends Operations>({
  response,
  scalars,
  returns,
  ops,
  initialZeusQuery,
  initialOp,
}: {
  ops: O;
  response: any;
  returns: ReturnTypesType;
  scalars?: Record<string, ScalarResolver | undefined>;
  initialOp: keyof O;
  initialZeusQuery: InputValueType | VType;
}) => {
  if (!scalars) {
    return response;
  }
  const builder = PrepareScalarPaths({
    ops,
    returns,
  });

  const scalarPaths = builder(initialOp as string, ops[initialOp], initialZeusQuery);
  if (scalarPaths) {
    const r = traverseResponse({ scalarPaths, resolvers: scalars })(initialOp as string, response, [ops[initialOp]]);
    return r;
  }
  return response;
};

export const traverseResponse = ({
  resolvers,
  scalarPaths,
}: {
  scalarPaths: { [x: string]: `scalar.${string}` };
  resolvers: {
    [x: string]: ScalarResolver | undefined;
  };
}) => {
  const ibb = (k: string, o: InputValueType | VType, p: string[] = []): unknown => {
    if (Array.isArray(o)) {
      return o.map((eachO) => ibb(k, eachO, p));
    }
    if (o == null) {
      return o;
    }
    const scalarPathString = p.join(SEPARATOR);
    const currentScalarString = scalarPaths[scalarPathString];
    if (currentScalarString) {
      const currentDecoder = resolvers[currentScalarString.split('.')[1]]?.decode;
      if (currentDecoder) {
        return currentDecoder(o);
      }
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string' || !o) {
      return o;
    }
    const entries = Object.entries(o).map(([k, v]) => [k, ibb(k, v, [...p, purifyGraphQLKey(k)])] as const);
    const objectFromEntries = entries.reduce<Record<string, unknown>>((a, [k, v]) => {
      a[k] = v;
      return a;
    }, {});
    return objectFromEntries;
  };
  return ibb;
};

export type AllTypesPropsType = {
  [x: string]:
    | undefined
    | `scalar.${string}`
    | 'enum'
    | {
        [x: string]:
          | undefined
          | string
          | {
              [x: string]: string | undefined;
            };
      };
};

export type ReturnTypesType = {
  [x: string]:
    | {
        [x: string]: string | undefined;
      }
    | `scalar.${string}`
    | undefined;
};
export type InputValueType = {
  [x: string]: undefined | boolean | string | number | [any, undefined | boolean | InputValueType] | InputValueType;
};
export type VType =
  | undefined
  | boolean
  | string
  | number
  | [any, undefined | boolean | InputValueType]
  | InputValueType;

export type PlainType = boolean | number | string | null | undefined;
export type ZeusArgsType =
  | PlainType
  | {
      [x: string]: ZeusArgsType;
    }
  | Array<ZeusArgsType>;

export type Operations = Record<string, string>;

export type VariableDefinition = {
  [x: string]: unknown;
};

export const SEPARATOR = '|';

export type fetchOptions = Parameters<typeof fetch>;
type websocketOptions = typeof WebSocket extends new (...args: infer R) => WebSocket ? R : never;
export type chainOptions = [fetchOptions[0], fetchOptions[1] & { websocket?: websocketOptions }] | [fetchOptions[0]];
export type FetchFunction = (query: string, variables?: Record<string, unknown>) => Promise<any>;
export type SubscriptionFunction = (query: string) => any;
type NotUndefined<T> = T extends undefined ? never : T;
export type ResolverType<F> = NotUndefined<F extends [infer ARGS, any] ? ARGS : undefined>;

export type OperationOptions = {
  operationName?: string;
};

export type ScalarCoder = Record<string, (s: unknown) => string>;

export interface GraphQLResponse {
  data?: Record<string, any>;
  errors?: Array<{
    message: string;
  }>;
}
export class GraphQLError extends Error {
  constructor(public response: GraphQLResponse) {
    super('');
    console.error(response);
  }
  toString() {
    return 'GraphQL Response Error';
  }
}
export type GenericOperation<O> = O extends keyof typeof Ops ? typeof Ops[O] : never;
export type ThunderGraphQLOptions<SCLR extends ScalarDefinition> = {
  scalars?: SCLR | ScalarCoders;
};

const ExtractScalar = (mappedParts: string[], returns: ReturnTypesType): `scalar.${string}` | undefined => {
  if (mappedParts.length === 0) {
    return;
  }
  const oKey = mappedParts[0];
  const returnP1 = returns[oKey];
  if (typeof returnP1 === 'object') {
    const returnP2 = returnP1[mappedParts[1]];
    if (returnP2) {
      return ExtractScalar([returnP2, ...mappedParts.slice(2)], returns);
    }
    return undefined;
  }
  return returnP1 as `scalar.${string}` | undefined;
};

export const PrepareScalarPaths = ({ ops, returns }: { returns: ReturnTypesType; ops: Operations }) => {
  const ibb = (
    k: string,
    originalKey: string,
    o: InputValueType | VType,
    p: string[] = [],
    pOriginals: string[] = [],
    root = true,
  ): { [x: string]: `scalar.${string}` } | undefined => {
    if (!o) {
      return;
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string') {
      const extractionArray = [...pOriginals, originalKey];
      const isScalar = ExtractScalar(extractionArray, returns);
      if (isScalar?.startsWith('scalar')) {
        const partOfTree = {
          [[...p, k].join(SEPARATOR)]: isScalar,
        };
        return partOfTree;
      }
      return {};
    }
    if (Array.isArray(o)) {
      return ibb(k, k, o[1], p, pOriginals, false);
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(alias, operationName, operation, p, pOriginals, false);
        })
        .reduce((a, b) => ({
          ...a,
          ...b,
        }));
    }
    const keyName = root ? ops[k] : k;
    return Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map(([k, v]) => {
        // Inline fragments shouldn't be added to the path as they aren't a field
        const isInlineFragment = originalKey.match(/^...\s*on/) != null;
        return ibb(
          k,
          k,
          v,
          isInlineFragment ? p : [...p, purifyGraphQLKey(keyName || k)],
          isInlineFragment ? pOriginals : [...pOriginals, purifyGraphQLKey(originalKey)],
          false,
        );
      })
      .reduce((a, b) => ({
        ...a,
        ...b,
      }));
  };
  return ibb;
};

export const purifyGraphQLKey = (k: string) => k.replace(/\([^)]*\)/g, '').replace(/^[^:]*\:/g, '');

const mapPart = (p: string) => {
  const [isArg, isField] = p.split('<>');
  if (isField) {
    return {
      v: isField,
      __type: 'field',
    } as const;
  }
  return {
    v: isArg,
    __type: 'arg',
  } as const;
};

type Part = ReturnType<typeof mapPart>;

export const ResolveFromPath = (props: AllTypesPropsType, returns: ReturnTypesType, ops: Operations) => {
  const ResolvePropsType = (mappedParts: Part[]) => {
    const oKey = ops[mappedParts[0].v];
    const propsP1 = oKey ? props[oKey] : props[mappedParts[0].v];
    if (propsP1 === 'enum' && mappedParts.length === 1) {
      return 'enum';
    }
    if (typeof propsP1 === 'string' && propsP1.startsWith('scalar.') && mappedParts.length === 1) {
      return propsP1;
    }
    if (typeof propsP1 === 'object') {
      if (mappedParts.length < 2) {
        return 'not';
      }
      const propsP2 = propsP1[mappedParts[1].v];
      if (typeof propsP2 === 'string') {
        return rpp(
          `${propsP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
      if (typeof propsP2 === 'object') {
        if (mappedParts.length < 3) {
          return 'not';
        }
        const propsP3 = propsP2[mappedParts[2].v];
        if (propsP3 && mappedParts[2].__type === 'arg') {
          return rpp(
            `${propsP3}${SEPARATOR}${mappedParts
              .slice(3)
              .map((mp) => mp.v)
              .join(SEPARATOR)}`,
          );
        }
      }
    }
  };
  const ResolveReturnType = (mappedParts: Part[]) => {
    if (mappedParts.length === 0) {
      return 'not';
    }
    const oKey = ops[mappedParts[0].v];
    const returnP1 = oKey ? returns[oKey] : returns[mappedParts[0].v];
    if (typeof returnP1 === 'object') {
      if (mappedParts.length < 2) return 'not';
      const returnP2 = returnP1[mappedParts[1].v];
      if (returnP2) {
        return rpp(
          `${returnP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
    }
  };
  const rpp = (path: string): 'enum' | 'not' | `scalar.${string}` => {
    const parts = path.split(SEPARATOR).filter((l) => l.length > 0);
    const mappedParts = parts.map(mapPart);
    const propsP1 = ResolvePropsType(mappedParts);
    if (propsP1) {
      return propsP1;
    }
    const returnP1 = ResolveReturnType(mappedParts);
    if (returnP1) {
      return returnP1;
    }
    return 'not';
  };
  return rpp;
};

export const InternalArgsBuilt = ({
  props,
  ops,
  returns,
  scalars,
  vars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  scalars?: ScalarDefinition;
  vars: Array<{ name: string; graphQLType: string }>;
}) => {
  const arb = (a: ZeusArgsType, p = '', root = true): string => {
    if (typeof a === 'string') {
      if (a.startsWith(START_VAR_NAME)) {
        const [varName, graphQLType] = a.replace(START_VAR_NAME, '$').split(GRAPHQL_TYPE_SEPARATOR);
        const v = vars.find((v) => v.name === varName);
        if (!v) {
          vars.push({
            name: varName,
            graphQLType,
          });
        } else {
          if (v.graphQLType !== graphQLType) {
            throw new Error(
              `Invalid variable exists with two different GraphQL Types, "${v.graphQLType}" and ${graphQLType}`,
            );
          }
        }
        return varName;
      }
    }
    const checkType = ResolveFromPath(props, returns, ops)(p);
    if (checkType.startsWith('scalar.')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ...splittedScalar] = checkType.split('.');
      const scalarKey = splittedScalar.join('.');
      return (scalars?.[scalarKey]?.encode?.(a) as string) || JSON.stringify(a);
    }
    if (Array.isArray(a)) {
      return `[${a.map((arr) => arb(arr, p, false)).join(', ')}]`;
    }
    if (typeof a === 'string') {
      if (checkType === 'enum') {
        return a;
      }
      return `${JSON.stringify(a)}`;
    }
    if (typeof a === 'object') {
      if (a === null) {
        return `null`;
      }
      const returnedObjectString = Object.entries(a)
        .filter(([, v]) => typeof v !== 'undefined')
        .map(([k, v]) => `${k}: ${arb(v, [p, k].join(SEPARATOR), false)}`)
        .join(',\n');
      if (!root) {
        return `{${returnedObjectString}}`;
      }
      return returnedObjectString;
    }
    return `${a}`;
  };
  return arb;
};

export const resolverFor = <X, T extends keyof ResolverInputTypes, Z extends keyof ResolverInputTypes[T]>(
  type: T,
  field: Z,
  fn: (
    args: Required<ResolverInputTypes[T]>[Z] extends [infer Input, any] ? Input : any,
    source: any,
  ) => Z extends keyof ModelTypes[T] ? ModelTypes[T][Z] | Promise<ModelTypes[T][Z]> | X : never,
) => fn as (args?: any, source?: any) => ReturnType<typeof fn>;

export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export type ZeusState<T extends (...args: any[]) => Promise<any>> = NonNullable<UnwrapPromise<ReturnType<T>>>;
export type ZeusHook<
  T extends (...args: any[]) => Record<string, (...args: any[]) => Promise<any>>,
  N extends keyof ReturnType<T>,
> = ZeusState<ReturnType<T>[N]>;

export type WithTypeNameValue<T> = T & {
  __typename?: boolean;
  __directives?: string;
};
export type AliasType<T> = WithTypeNameValue<T> & {
  __alias?: Record<string, WithTypeNameValue<T>>;
};
type DeepAnify<T> = {
  [P in keyof T]?: any;
};
type IsPayLoad<T> = T extends [any, infer PayLoad] ? PayLoad : T;
export type ScalarDefinition = Record<string, ScalarResolver>;

type IsScalar<S, SCLR extends ScalarDefinition> = S extends 'scalar' & { name: infer T }
  ? T extends keyof SCLR
    ? SCLR[T]['decode'] extends (s: unknown) => unknown
      ? ReturnType<SCLR[T]['decode']>
      : unknown
    : unknown
  : S;
type IsArray<T, U, SCLR extends ScalarDefinition> = T extends Array<infer R>
  ? InputType<R, U, SCLR>[]
  : InputType<T, U, SCLR>;
type FlattenArray<T> = T extends Array<infer R> ? R : T;
type BaseZeusResolver = boolean | 1 | string | Variable<any, string>;

type IsInterfaced<SRC extends DeepAnify<DST>, DST, SCLR extends ScalarDefinition> = FlattenArray<SRC> extends
  | ZEUS_INTERFACES
  | ZEUS_UNIONS
  ? {
      [P in keyof SRC]: SRC[P] extends '__union' & infer R
        ? P extends keyof DST
          ? IsArray<R, '__typename' extends keyof DST ? DST[P] & { __typename: true } : DST[P], SCLR>
          : IsArray<R, '__typename' extends keyof DST ? { __typename: true } : Record<string, never>, SCLR>
        : never;
    }[keyof SRC] & {
      [P in keyof Omit<
        Pick<
          SRC,
          {
            [P in keyof DST]: SRC[P] extends '__union' & infer R ? never : P;
          }[keyof DST]
        >,
        '__typename'
      >]: IsPayLoad<DST[P]> extends BaseZeusResolver ? IsScalar<SRC[P], SCLR> : IsArray<SRC[P], DST[P], SCLR>;
    }
  : {
      [P in keyof Pick<SRC, keyof DST>]: IsPayLoad<DST[P]> extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    };

export type MapType<SRC, DST, SCLR extends ScalarDefinition> = SRC extends DeepAnify<DST>
  ? IsInterfaced<SRC, DST, SCLR>
  : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export type InputType<SRC, DST, SCLR extends ScalarDefinition = {}> = IsPayLoad<DST> extends { __alias: infer R }
  ? {
      [P in keyof R]: MapType<SRC, R[P], SCLR>[keyof MapType<SRC, R[P], SCLR>];
    } & MapType<SRC, Omit<IsPayLoad<DST>, '__alias'>, SCLR>
  : MapType<SRC, IsPayLoad<DST>, SCLR>;
export type SubscriptionToGraphQL<Z, T, SCLR extends ScalarDefinition> = {
  ws: WebSocket;
  on: (fn: (args: InputType<T, Z, SCLR>) => void) => void;
  off: (fn: (e: { data?: InputType<T, Z, SCLR>; code?: number; reason?: string; message?: string }) => void) => void;
  error: (fn: (e: { data?: InputType<T, Z, SCLR>; errors?: string[] }) => void) => void;
  open: () => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type FromSelector<SELECTOR, NAME extends keyof GraphQLTypes, SCLR extends ScalarDefinition = {}> = InputType<
  GraphQLTypes[NAME],
  SELECTOR,
  SCLR
>;

export type ScalarResolver = {
  encode?: (s: unknown) => string;
  decode?: (s: unknown) => unknown;
};

export type SelectionFunction<V> = <T>(t: T | V) => T;

type BuiltInVariableTypes = {
  ['String']: string;
  ['Int']: number;
  ['Float']: number;
  ['ID']: unknown;
  ['Boolean']: boolean;
};
type AllVariableTypes = keyof BuiltInVariableTypes | keyof ZEUS_VARIABLES;
type VariableRequired<T extends string> = `${T}!` | T | `[${T}]` | `[${T}]!` | `[${T}!]` | `[${T}!]!`;
type VR<T extends string> = VariableRequired<VariableRequired<T>>;

export type GraphQLVariableType = VR<AllVariableTypes>;

type ExtractVariableTypeString<T extends string> = T extends VR<infer R1>
  ? R1 extends VR<infer R2>
    ? R2 extends VR<infer R3>
      ? R3 extends VR<infer R4>
        ? R4 extends VR<infer R5>
          ? R5
          : R4
        : R3
      : R2
    : R1
  : T;

type DecomposeType<T, Type> = T extends `[${infer R}]`
  ? Array<DecomposeType<R, Type>> | undefined
  : T extends `${infer R}!`
  ? NonNullable<DecomposeType<R, Type>>
  : Type | undefined;

type ExtractTypeFromGraphQLType<T extends string> = T extends keyof ZEUS_VARIABLES
  ? ZEUS_VARIABLES[T]
  : T extends keyof BuiltInVariableTypes
  ? BuiltInVariableTypes[T]
  : any;

export type GetVariableType<T extends string> = DecomposeType<
  T,
  ExtractTypeFromGraphQLType<ExtractVariableTypeString<T>>
>;

type UndefinedKeys<T> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];

type WithNullableKeys<T> = Pick<T, UndefinedKeys<T>>;
type WithNonNullableKeys<T> = Omit<T, UndefinedKeys<T>>;

type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

export type WithOptionalNullables<T> = OptionalKeys<WithNullableKeys<T>> & WithNonNullableKeys<T>;

export type Variable<T extends GraphQLVariableType, Name extends string> = {
  ' __zeus_name': Name;
  ' __zeus_type': T;
};

export type ExtractVariablesDeep<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariablesDeep<Query[K]>> }[keyof Query]>;

export type ExtractVariables<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariablesDeep<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariables<Query[K]>> }[keyof Query]>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export const START_VAR_NAME = `$ZEUS_VAR`;
export const GRAPHQL_TYPE_SEPARATOR = `__$GRAPHQL__`;

export const $ = <Type extends GraphQLVariableType, Name extends string>(name: Name, graphqlType: Type) => {
  return (START_VAR_NAME + name + GRAPHQL_TYPE_SEPARATOR + graphqlType) as unknown as Variable<Type, Name>;
};
type ZEUS_INTERFACES = never
export type ScalarCoders = {
	QuestionType?: ScalarResolver;
	timestamp?: ScalarResolver;
	timestamptz?: ScalarResolver;
}
type ZEUS_UNIONS = never

export type ValueTypes = {
    /** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_array_comparison_exp"]: {
	/** is the array contained in the given array value */
	_contained_in?: Array<boolean> | undefined | null | Variable<any, string>,
	/** does the array contain the given value */
	_contains?: Array<boolean> | undefined | null | Variable<any, string>,
	_eq?: Array<boolean> | undefined | null | Variable<any, string>,
	_gt?: Array<boolean> | undefined | null | Variable<any, string>,
	_gte?: Array<boolean> | undefined | null | Variable<any, string>,
	_in?: Array<Array<boolean> | undefined | null> | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: Array<boolean> | undefined | null | Variable<any, string>,
	_lte?: Array<boolean> | undefined | null | Variable<any, string>,
	_neq?: Array<boolean> | undefined | null | Variable<any, string>,
	_nin?: Array<Array<boolean> | undefined | null> | Variable<any, string>
};
	/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_comparison_exp"]: {
	_eq?: boolean | undefined | null | Variable<any, string>,
	_gt?: boolean | undefined | null | Variable<any, string>,
	_gte?: boolean | undefined | null | Variable<any, string>,
	_in?: Array<boolean> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: boolean | undefined | null | Variable<any, string>,
	_lte?: boolean | undefined | null | Variable<any, string>,
	_neq?: boolean | undefined | null | Variable<any, string>,
	_nin?: Array<boolean> | undefined | null | Variable<any, string>
};
	/** columns and relationships of "Exam" */
["Exam"]: AliasType<{
Questions?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Question_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question"]],
Questions_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Question_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question_aggregate"]],
ScheduledExams?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
ScheduledExams_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam_aggregate"]],
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "Exam" */
["Exam_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Exam_aggregate_fields"],
	nodes?:ValueTypes["Exam"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Exam" */
["Exam_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Exam_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Exam_max_fields"],
	min?:ValueTypes["Exam_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Exam". All fields are combined with a logical 'AND'. */
["Exam_bool_exp"]: {
	Questions?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>,
	Questions_aggregate?: ValueTypes["Question_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	ScheduledExams?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>,
	ScheduledExams_aggregate?: ValueTypes["ScheduledExam_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Exam_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Exam_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	description?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Exam" */
["Exam_constraint"]:Exam_constraint;
	/** input type for inserting data into table "Exam" */
["Exam_insert_input"]: {
	Questions?: ValueTypes["Question_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	ScheduledExams?: ValueTypes["ScheduledExam_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Exam_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Exam_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Exam" */
["Exam_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Exam"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Exam" */
["Exam_obj_rel_insert_input"]: {
	data: ValueTypes["Exam_insert_input"] | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Exam_on_conflict"] | undefined | null | Variable<any, string>
};
	/** on_conflict condition type for table "Exam" */
["Exam_on_conflict"]: {
	constraint: ValueTypes["Exam_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Exam_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Exam". */
["Exam_order_by"]: {
	Questions_aggregate?: ValueTypes["Question_aggregate_order_by"] | undefined | null | Variable<any, string>,
	ScheduledExams_aggregate?: ValueTypes["ScheduledExam_aggregate_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	description?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Exam */
["Exam_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "Exam" */
["Exam_select_column"]:Exam_select_column;
	/** input type for updating data in table "Exam" */
["Exam_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Exam" */
["Exam_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Exam_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Exam_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "Exam" */
["Exam_update_column"]:Exam_update_column;
	["Exam_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Exam_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Exam_bool_exp"] | Variable<any, string>
};
	/** columns and relationships of "Group" */
["Group"]: AliasType<{
GroupMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember"]],
GroupMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember_aggregate"]],
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
scheduledExamsByGroupId?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
scheduledExamsByGroupId_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam_aggregate"]],
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "GroupMember" */
["GroupMember"]: AliasType<{
	/** An object relationship */
	Group?:ValueTypes["Group"],
	/** An object relationship */
	Profile?:ValueTypes["Profile"],
	created_at?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "GroupMember" */
["GroupMember_aggregate"]: AliasType<{
	aggregate?:ValueTypes["GroupMember_aggregate_fields"],
	nodes?:ValueTypes["GroupMember"],
		__typename?: boolean | `@${string}`
}>;
	["GroupMember_aggregate_bool_exp"]: {
	count?: ValueTypes["GroupMember_aggregate_bool_exp_count"] | undefined | null | Variable<any, string>
};
	["GroupMember_aggregate_bool_exp_count"]: {
	arguments?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Int_comparison_exp"] | Variable<any, string>
};
	/** aggregate fields of "GroupMember" */
["GroupMember_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["GroupMember_max_fields"],
	min?:ValueTypes["GroupMember_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "GroupMember" */
["GroupMember_aggregate_order_by"]: {
	count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	max?: ValueTypes["GroupMember_max_order_by"] | undefined | null | Variable<any, string>,
	min?: ValueTypes["GroupMember_min_order_by"] | undefined | null | Variable<any, string>
};
	/** input type for inserting array relation for remote table "GroupMember" */
["GroupMember_arr_rel_insert_input"]: {
	data: Array<ValueTypes["GroupMember_insert_input"]> | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["GroupMember_on_conflict"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "GroupMember". All fields are combined with a logical 'AND'. */
["GroupMember_bool_exp"]: {
	Group?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["GroupMember_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["GroupMember_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "GroupMember" */
["GroupMember_constraint"]:GroupMember_constraint;
	/** input type for inserting data into table "GroupMember" */
["GroupMember_insert_input"]: {
	Group?: ValueTypes["Group_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	group_id?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["GroupMember_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "GroupMember" */
["GroupMember_max_order_by"]: {
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** aggregate min on columns */
["GroupMember_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "GroupMember" */
["GroupMember_min_order_by"]: {
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** response of any mutation on the table "GroupMember" */
["GroupMember_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["GroupMember"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "GroupMember" */
["GroupMember_on_conflict"]: {
	constraint: ValueTypes["GroupMember_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["GroupMember_update_column"]> | Variable<any, string>,
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "GroupMember". */
["GroupMember_order_by"]: {
	Group?: ValueTypes["Group_order_by"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: GroupMember */
["GroupMember_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "GroupMember" */
["GroupMember_select_column"]:GroupMember_select_column;
	/** input type for updating data in table "GroupMember" */
["GroupMember_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	group_id?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "GroupMember" */
["GroupMember_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["GroupMember_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["GroupMember_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	group_id?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "GroupMember" */
["GroupMember_update_column"]:GroupMember_update_column;
	["GroupMember_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["GroupMember_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["GroupMember_bool_exp"] | Variable<any, string>
};
	/** aggregated selection of "Group" */
["Group_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Group_aggregate_fields"],
	nodes?:ValueTypes["Group"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Group" */
["Group_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Group_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Group_max_fields"],
	min?:ValueTypes["Group_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Group". All fields are combined with a logical 'AND'. */
["Group_bool_exp"]: {
	GroupMembers?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>,
	GroupMembers_aggregate?: ValueTypes["GroupMember_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Group_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Group_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	description?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	scheduledExamsByGroupId?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>,
	scheduledExamsByGroupId_aggregate?: ValueTypes["ScheduledExam_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	website?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Group" */
["Group_constraint"]:Group_constraint;
	/** input type for inserting data into table "Group" */
["Group_insert_input"]: {
	GroupMembers?: ValueTypes["GroupMember_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	scheduledExamsByGroupId?: ValueTypes["ScheduledExam_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	website?: string | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Group_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Group_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Group" */
["Group_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Group"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Group" */
["Group_obj_rel_insert_input"]: {
	data: ValueTypes["Group_insert_input"] | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Group_on_conflict"] | undefined | null | Variable<any, string>
};
	/** on_conflict condition type for table "Group" */
["Group_on_conflict"]: {
	constraint: ValueTypes["Group_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Group_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Group". */
["Group_order_by"]: {
	GroupMembers_aggregate?: ValueTypes["GroupMember_aggregate_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	description?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	scheduledExamsByGroupId_aggregate?: ValueTypes["ScheduledExam_aggregate_order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	website?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Group */
["Group_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "Group" */
["Group_select_column"]:Group_select_column;
	/** input type for updating data in table "Group" */
["Group_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	website?: string | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Group" */
["Group_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Group_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Group_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	website?: string | undefined | null | Variable<any, string>
};
	/** update columns of table "Group" */
["Group_update_column"]:Group_update_column;
	["Group_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Group_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Group_bool_exp"] | Variable<any, string>
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
	_eq?: number | undefined | null | Variable<any, string>,
	_gt?: number | undefined | null | Variable<any, string>,
	_gte?: number | undefined | null | Variable<any, string>,
	_in?: Array<number> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: number | undefined | null | Variable<any, string>,
	_lte?: number | undefined | null | Variable<any, string>,
	_neq?: number | undefined | null | Variable<any, string>,
	_nin?: Array<number> | undefined | null | Variable<any, string>
};
	/** columns and relationships of "Organization" */
["Organization"]: AliasType<{
OrganizationMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember"]],
OrganizationMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember_aggregate"]],
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "OrganizationMember" */
["OrganizationMember"]: AliasType<{
	/** An object relationship */
	Organization?:ValueTypes["Organization"],
	/** An object relationship */
	Profile?:ValueTypes["Profile"],
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	organization_id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "OrganizationMember" */
["OrganizationMember_aggregate"]: AliasType<{
	aggregate?:ValueTypes["OrganizationMember_aggregate_fields"],
	nodes?:ValueTypes["OrganizationMember"],
		__typename?: boolean | `@${string}`
}>;
	["OrganizationMember_aggregate_bool_exp"]: {
	count?: ValueTypes["OrganizationMember_aggregate_bool_exp_count"] | undefined | null | Variable<any, string>
};
	["OrganizationMember_aggregate_bool_exp_count"]: {
	arguments?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Int_comparison_exp"] | Variable<any, string>
};
	/** aggregate fields of "OrganizationMember" */
["OrganizationMember_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["OrganizationMember_max_fields"],
	min?:ValueTypes["OrganizationMember_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "OrganizationMember" */
["OrganizationMember_aggregate_order_by"]: {
	count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	max?: ValueTypes["OrganizationMember_max_order_by"] | undefined | null | Variable<any, string>,
	min?: ValueTypes["OrganizationMember_min_order_by"] | undefined | null | Variable<any, string>
};
	/** input type for inserting array relation for remote table "OrganizationMember" */
["OrganizationMember_arr_rel_insert_input"]: {
	data: Array<ValueTypes["OrganizationMember_insert_input"]> | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["OrganizationMember_on_conflict"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "OrganizationMember". All fields are combined with a logical 'AND'. */
["OrganizationMember_bool_exp"]: {
	Organization?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["OrganizationMember_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["OrganizationMember_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	organization_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	role?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "OrganizationMember" */
["OrganizationMember_constraint"]:OrganizationMember_constraint;
	/** input type for inserting data into table "OrganizationMember" */
["OrganizationMember_insert_input"]: {
	Organization?: ValueTypes["Organization_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	organization_id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	role?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["OrganizationMember_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	organization_id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "OrganizationMember" */
["OrganizationMember_max_order_by"]: {
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	organization_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	role?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** aggregate min on columns */
["OrganizationMember_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	organization_id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "OrganizationMember" */
["OrganizationMember_min_order_by"]: {
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	organization_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	role?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** response of any mutation on the table "OrganizationMember" */
["OrganizationMember_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["OrganizationMember"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "OrganizationMember" */
["OrganizationMember_on_conflict"]: {
	constraint: ValueTypes["OrganizationMember_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["OrganizationMember_update_column"]> | Variable<any, string>,
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "OrganizationMember". */
["OrganizationMember_order_by"]: {
	Organization?: ValueTypes["Organization_order_by"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	organization_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	role?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: OrganizationMember */
["OrganizationMember_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "OrganizationMember" */
["OrganizationMember_select_column"]:OrganizationMember_select_column;
	/** input type for updating data in table "OrganizationMember" */
["OrganizationMember_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	organization_id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	role?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "OrganizationMember" */
["OrganizationMember_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["OrganizationMember_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["OrganizationMember_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	organization_id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	role?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "OrganizationMember" */
["OrganizationMember_update_column"]:OrganizationMember_update_column;
	["OrganizationMember_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["OrganizationMember_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["OrganizationMember_bool_exp"] | Variable<any, string>
};
	/** aggregated selection of "Organization" */
["Organization_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Organization_aggregate_fields"],
	nodes?:ValueTypes["Organization"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Organization" */
["Organization_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Organization_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Organization_max_fields"],
	min?:ValueTypes["Organization_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Organization". All fields are combined with a logical 'AND'. */
["Organization_bool_exp"]: {
	OrganizationMembers?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>,
	OrganizationMembers_aggregate?: ValueTypes["OrganizationMember_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Organization_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Organization_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	description?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	website?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Organization" */
["Organization_constraint"]:Organization_constraint;
	/** input type for inserting data into table "Organization" */
["Organization_insert_input"]: {
	OrganizationMembers?: ValueTypes["OrganizationMember_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	website?: string | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Organization_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Organization_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Organization" */
["Organization_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Organization"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Organization" */
["Organization_obj_rel_insert_input"]: {
	data: ValueTypes["Organization_insert_input"] | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Organization_on_conflict"] | undefined | null | Variable<any, string>
};
	/** on_conflict condition type for table "Organization" */
["Organization_on_conflict"]: {
	constraint: ValueTypes["Organization_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Organization_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Organization". */
["Organization_order_by"]: {
	OrganizationMembers_aggregate?: ValueTypes["OrganizationMember_aggregate_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	description?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	website?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Organization */
["Organization_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "Organization" */
["Organization_select_column"]:Organization_select_column;
	/** input type for updating data in table "Organization" */
["Organization_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	website?: string | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Organization" */
["Organization_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Organization_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Organization_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	website?: string | undefined | null | Variable<any, string>
};
	/** update columns of table "Organization" */
["Organization_update_column"]:Organization_update_column;
	["Organization_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Organization_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Organization_bool_exp"] | Variable<any, string>
};
	/** columns and relationships of "Profile" */
["Profile"]: AliasType<{
GroupMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember"]],
GroupMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember_aggregate"]],
OrganizationMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember"]],
OrganizationMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember_aggregate"]],
ScheduledExams?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
ScheduledExams_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam_aggregate"]],
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Profile_aggregate_fields"],
	nodes?:ValueTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Profile_max_fields"],
	min?:ValueTypes["Profile_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
	GroupMembers?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>,
	GroupMembers_aggregate?: ValueTypes["GroupMember_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	OrganizationMembers?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>,
	OrganizationMembers_aggregate?: ValueTypes["OrganizationMember_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	ScheduledExams?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>,
	ScheduledExams_aggregate?: ValueTypes["ScheduledExam_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Profile_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Profile_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	first_name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	last_name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Profile" */
["Profile_constraint"]:Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
	GroupMembers?: ValueTypes["GroupMember_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	OrganizationMembers?: ValueTypes["OrganizationMember_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	ScheduledExams?: ValueTypes["ScheduledExam_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	first_name?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	last_name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Profile_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Profile_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
	data: ValueTypes["Profile_insert_input"] | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Profile_on_conflict"] | undefined | null | Variable<any, string>
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
	constraint: ValueTypes["Profile_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Profile_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
	GroupMembers_aggregate?: ValueTypes["GroupMember_aggregate_order_by"] | undefined | null | Variable<any, string>,
	OrganizationMembers_aggregate?: ValueTypes["OrganizationMember_aggregate_order_by"] | undefined | null | Variable<any, string>,
	ScheduledExams_aggregate?: ValueTypes["ScheduledExam_aggregate_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	first_name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	last_name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "Profile" */
["Profile_select_column"]:Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	first_name?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	last_name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Profile_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	first_name?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	last_name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "Profile" */
["Profile_update_column"]:Profile_update_column;
	["Profile_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Profile_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Profile_bool_exp"] | Variable<any, string>
};
	/** columns and relationships of "Question" */
["Question"]: AliasType<{
	/** An object relationship */
	Exam?:ValueTypes["Exam"],
	boolean_expected_answer?:boolean | `@${string}`,
	correct_options?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	expected_answer?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	image_url?:boolean | `@${string}`,
	options?:boolean | `@${string}`,
	question?:boolean | `@${string}`,
	type?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["QuestionType"]:unknown;
	/** Boolean expression to compare columns of type "QuestionType". All fields are combined with logical 'AND'. */
["QuestionType_comparison_exp"]: {
	_eq?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["QuestionType"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["QuestionType"]> | undefined | null | Variable<any, string>
};
	/** aggregated selection of "Question" */
["Question_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Question_aggregate_fields"],
	nodes?:ValueTypes["Question"],
		__typename?: boolean | `@${string}`
}>;
	["Question_aggregate_bool_exp"]: {
	bool_and?: ValueTypes["Question_aggregate_bool_exp_bool_and"] | undefined | null | Variable<any, string>,
	bool_or?: ValueTypes["Question_aggregate_bool_exp_bool_or"] | undefined | null | Variable<any, string>,
	count?: ValueTypes["Question_aggregate_bool_exp_count"] | undefined | null | Variable<any, string>
};
	["Question_aggregate_bool_exp_bool_and"]: {
	arguments: ValueTypes["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"] | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Boolean_comparison_exp"] | Variable<any, string>
};
	["Question_aggregate_bool_exp_bool_or"]: {
	arguments: ValueTypes["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"] | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Boolean_comparison_exp"] | Variable<any, string>
};
	["Question_aggregate_bool_exp_count"]: {
	arguments?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Int_comparison_exp"] | Variable<any, string>
};
	/** aggregate fields of "Question" */
["Question_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Question_max_fields"],
	min?:ValueTypes["Question_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "Question" */
["Question_aggregate_order_by"]: {
	count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	max?: ValueTypes["Question_max_order_by"] | undefined | null | Variable<any, string>,
	min?: ValueTypes["Question_min_order_by"] | undefined | null | Variable<any, string>
};
	/** input type for inserting array relation for remote table "Question" */
["Question_arr_rel_insert_input"]: {
	data: Array<ValueTypes["Question_insert_input"]> | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Question_on_conflict"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "Question". All fields are combined with a logical 'AND'. */
["Question_bool_exp"]: {
	Exam?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Question_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Question_bool_exp"]> | undefined | null | Variable<any, string>,
	boolean_expected_answer?: ValueTypes["Boolean_comparison_exp"] | undefined | null | Variable<any, string>,
	correct_options?: ValueTypes["Boolean_array_comparison_exp"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	expected_answer?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	image_url?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	options?: ValueTypes["String_array_comparison_exp"] | undefined | null | Variable<any, string>,
	question?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	type?: ValueTypes["QuestionType_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Question" */
["Question_constraint"]:Question_constraint;
	/** input type for inserting data into table "Question" */
["Question_insert_input"]: {
	Exam?: ValueTypes["Exam_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	boolean_expected_answer?: boolean | undefined | null | Variable<any, string>,
	correct_options?: Array<boolean> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	exam_id?: string | undefined | null | Variable<any, string>,
	expected_answer?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	image_url?: string | undefined | null | Variable<any, string>,
	options?: Array<string> | undefined | null | Variable<any, string>,
	question?: string | undefined | null | Variable<any, string>,
	type?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Question_max_fields"]: AliasType<{
	correct_options?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	expected_answer?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	image_url?:boolean | `@${string}`,
	options?:boolean | `@${string}`,
	question?:boolean | `@${string}`,
	type?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "Question" */
["Question_max_order_by"]: {
	correct_options?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	expected_answer?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	image_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	options?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	question?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	type?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** aggregate min on columns */
["Question_min_fields"]: AliasType<{
	correct_options?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	expected_answer?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	image_url?:boolean | `@${string}`,
	options?:boolean | `@${string}`,
	question?:boolean | `@${string}`,
	type?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "Question" */
["Question_min_order_by"]: {
	correct_options?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	expected_answer?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	image_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	options?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	question?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	type?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** response of any mutation on the table "Question" */
["Question_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Question"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "Question" */
["Question_on_conflict"]: {
	constraint: ValueTypes["Question_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Question_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Question". */
["Question_order_by"]: {
	Exam?: ValueTypes["Exam_order_by"] | undefined | null | Variable<any, string>,
	boolean_expected_answer?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	correct_options?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	expected_answer?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	image_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	options?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	question?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	type?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Question */
["Question_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "Question" */
["Question_select_column"]:Question_select_column;
	/** select "Question_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Question" */
["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"]:Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns;
	/** select "Question_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Question" */
["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"]:Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns;
	/** input type for updating data in table "Question" */
["Question_set_input"]: {
	boolean_expected_answer?: boolean | undefined | null | Variable<any, string>,
	correct_options?: Array<boolean> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	exam_id?: string | undefined | null | Variable<any, string>,
	expected_answer?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	image_url?: string | undefined | null | Variable<any, string>,
	options?: Array<string> | undefined | null | Variable<any, string>,
	question?: string | undefined | null | Variable<any, string>,
	type?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Question" */
["Question_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Question_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Question_stream_cursor_value_input"]: {
	boolean_expected_answer?: boolean | undefined | null | Variable<any, string>,
	correct_options?: Array<boolean> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	exam_id?: string | undefined | null | Variable<any, string>,
	expected_answer?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	image_url?: string | undefined | null | Variable<any, string>,
	options?: Array<string> | undefined | null | Variable<any, string>,
	question?: string | undefined | null | Variable<any, string>,
	type?: ValueTypes["QuestionType"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "Question" */
["Question_update_column"]:Question_update_column;
	["Question_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Question_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Question_bool_exp"] | Variable<any, string>
};
	/** columns and relationships of "ScheduledExam" */
["ScheduledExam"]: AliasType<{
	/** An object relationship */
	Profile?:ValueTypes["Profile"],
	created_at?:boolean | `@${string}`,
	end_time?:boolean | `@${string}`,
	/** An object relationship */
	examByExamId?:ValueTypes["Exam"],
	exam_id?:boolean | `@${string}`,
	/** An object relationship */
	groupByGroupId?:ValueTypes["Group"],
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	start_time?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "ScheduledExam" */
["ScheduledExam_aggregate"]: AliasType<{
	aggregate?:ValueTypes["ScheduledExam_aggregate_fields"],
	nodes?:ValueTypes["ScheduledExam"],
		__typename?: boolean | `@${string}`
}>;
	["ScheduledExam_aggregate_bool_exp"]: {
	count?: ValueTypes["ScheduledExam_aggregate_bool_exp_count"] | undefined | null | Variable<any, string>
};
	["ScheduledExam_aggregate_bool_exp_count"]: {
	arguments?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Int_comparison_exp"] | Variable<any, string>
};
	/** aggregate fields of "ScheduledExam" */
["ScheduledExam_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["ScheduledExam_max_fields"],
	min?:ValueTypes["ScheduledExam_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "ScheduledExam" */
["ScheduledExam_aggregate_order_by"]: {
	count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	max?: ValueTypes["ScheduledExam_max_order_by"] | undefined | null | Variable<any, string>,
	min?: ValueTypes["ScheduledExam_min_order_by"] | undefined | null | Variable<any, string>
};
	/** input type for inserting array relation for remote table "ScheduledExam" */
["ScheduledExam_arr_rel_insert_input"]: {
	data: Array<ValueTypes["ScheduledExam_insert_input"]> | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["ScheduledExam_on_conflict"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "ScheduledExam". All fields are combined with a logical 'AND'. */
["ScheduledExam_bool_exp"]: {
	Profile?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["ScheduledExam_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["ScheduledExam_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	examByExamId?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	groupByGroupId?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "ScheduledExam" */
["ScheduledExam_constraint"]:ScheduledExam_constraint;
	/** input type for inserting data into table "ScheduledExam" */
["ScheduledExam_insert_input"]: {
	Profile?: ValueTypes["Profile_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	examByExamId?: ValueTypes["Exam_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	exam_id?: string | undefined | null | Variable<any, string>,
	groupByGroupId?: ValueTypes["Group_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	group_id?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["ScheduledExam_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	end_time?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	start_time?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "ScheduledExam" */
["ScheduledExam_max_order_by"]: {
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** aggregate min on columns */
["ScheduledExam_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	end_time?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	start_time?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "ScheduledExam" */
["ScheduledExam_min_order_by"]: {
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** response of any mutation on the table "ScheduledExam" */
["ScheduledExam_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["ScheduledExam"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "ScheduledExam" */
["ScheduledExam_on_conflict"]: {
	constraint: ValueTypes["ScheduledExam_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["ScheduledExam_update_column"]> | Variable<any, string>,
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "ScheduledExam". */
["ScheduledExam_order_by"]: {
	Profile?: ValueTypes["Profile_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	examByExamId?: ValueTypes["Exam_order_by"] | undefined | null | Variable<any, string>,
	exam_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	groupByGroupId?: ValueTypes["Group_order_by"] | undefined | null | Variable<any, string>,
	group_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: ScheduledExam */
["ScheduledExam_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "ScheduledExam" */
["ScheduledExam_select_column"]:ScheduledExam_select_column;
	/** input type for updating data in table "ScheduledExam" */
["ScheduledExam_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	exam_id?: string | undefined | null | Variable<any, string>,
	group_id?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "ScheduledExam" */
["ScheduledExam_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["ScheduledExam_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["ScheduledExam_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	end_time?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	exam_id?: string | undefined | null | Variable<any, string>,
	group_id?: string | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	profile_id?: string | undefined | null | Variable<any, string>,
	start_time?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "ScheduledExam" */
["ScheduledExam_update_column"]:ScheduledExam_update_column;
	["ScheduledExam_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["ScheduledExam_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["ScheduledExam_bool_exp"] | Variable<any, string>
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_array_comparison_exp"]: {
	/** is the array contained in the given array value */
	_contained_in?: Array<string> | undefined | null | Variable<any, string>,
	/** does the array contain the given value */
	_contains?: Array<string> | undefined | null | Variable<any, string>,
	_eq?: Array<string> | undefined | null | Variable<any, string>,
	_gt?: Array<string> | undefined | null | Variable<any, string>,
	_gte?: Array<string> | undefined | null | Variable<any, string>,
	_in?: Array<Array<string> | undefined | null> | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: Array<string> | undefined | null | Variable<any, string>,
	_lte?: Array<string> | undefined | null | Variable<any, string>,
	_neq?: Array<string> | undefined | null | Variable<any, string>,
	_nin?: Array<Array<string> | undefined | null> | Variable<any, string>
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
	_eq?: string | undefined | null | Variable<any, string>,
	_gt?: string | undefined | null | Variable<any, string>,
	_gte?: string | undefined | null | Variable<any, string>,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined | null | Variable<any, string>,
	_in?: Array<string> | undefined | null | Variable<any, string>,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	/** does the column match the given pattern */
	_like?: string | undefined | null | Variable<any, string>,
	_lt?: string | undefined | null | Variable<any, string>,
	_lte?: string | undefined | null | Variable<any, string>,
	_neq?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined | null | Variable<any, string>,
	_nin?: Array<string> | undefined | null | Variable<any, string>,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined | null | Variable<any, string>,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined | null | Variable<any, string>,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined | null | Variable<any, string>
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: AliasType<{
	aggregate?:ValueTypes["_prisma_migrations_aggregate_fields"],
	nodes?:ValueTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: AliasType<{
	avg?:ValueTypes["_prisma_migrations_avg_fields"],
count?: [{	columns?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["_prisma_migrations_max_fields"],
	min?:ValueTypes["_prisma_migrations_min_fields"],
	stddev?:ValueTypes["_prisma_migrations_stddev_fields"],
	stddev_pop?:ValueTypes["_prisma_migrations_stddev_pop_fields"],
	stddev_samp?:ValueTypes["_prisma_migrations_stddev_samp_fields"],
	sum?:ValueTypes["_prisma_migrations_sum_fields"],
	var_pop?:ValueTypes["_prisma_migrations_var_pop_fields"],
	var_samp?:ValueTypes["_prisma_migrations_var_samp_fields"],
	variance?:ValueTypes["_prisma_migrations_variance_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
	_and?: Array<ValueTypes["_prisma_migrations_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["_prisma_migrations_bool_exp"]> | undefined | null | Variable<any, string>,
	applied_steps_count?: ValueTypes["Int_comparison_exp"] | undefined | null | Variable<any, string>,
	checksum?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	logs?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	migration_name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz_comparison_exp"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "_prisma_migrations" */
["_prisma_migrations_constraint"]:_prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>,
	checksum?: string | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	logs?: string | undefined | null | Variable<any, string>,
	migration_name?: string | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
	constraint: ValueTypes["_prisma_migrations_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["_prisma_migrations_update_column"]> | Variable<any, string>,
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
	applied_steps_count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	checksum?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	logs?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	migration_name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "_prisma_migrations" */
["_prisma_migrations_select_column"]:_prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>,
	checksum?: string | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	logs?: string | undefined | null | Variable<any, string>,
	migration_name?: string | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["_prisma_migrations_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>,
	checksum?: string | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	logs?: string | undefined | null | Variable<any, string>,
	migration_name?: string | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** update columns of table "_prisma_migrations" */
["_prisma_migrations_update_column"]:_prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: ValueTypes["_prisma_migrations_inc_input"] | undefined | null | Variable<any, string>,
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["_prisma_migrations_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["_prisma_migrations_bool_exp"] | Variable<any, string>
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** ordering argument of a cursor */
["cursor_ordering"]:cursor_ordering;
	/** mutation root */
["mutation_root"]: AliasType<{
delete_Exam?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Exam_bool_exp"] | Variable<any, string>},ValueTypes["Exam_mutation_response"]],
delete_Exam_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Exam"]],
delete_Group?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Group_bool_exp"] | Variable<any, string>},ValueTypes["Group_mutation_response"]],
delete_GroupMember?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["GroupMember_bool_exp"] | Variable<any, string>},ValueTypes["GroupMember_mutation_response"]],
delete_GroupMember_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["GroupMember"]],
delete_Group_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Group"]],
delete_Organization?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Organization_bool_exp"] | Variable<any, string>},ValueTypes["Organization_mutation_response"]],
delete_OrganizationMember?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["OrganizationMember_bool_exp"] | Variable<any, string>},ValueTypes["OrganizationMember_mutation_response"]],
delete_OrganizationMember_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["OrganizationMember"]],
delete_Organization_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Organization"]],
delete_Profile?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Profile_bool_exp"] | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
delete_Profile_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Profile"]],
delete_Question?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Question_bool_exp"] | Variable<any, string>},ValueTypes["Question_mutation_response"]],
delete_Question_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Question"]],
delete_ScheduledExam?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["ScheduledExam_bool_exp"] | Variable<any, string>},ValueTypes["ScheduledExam_mutation_response"]],
delete_ScheduledExam_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["ScheduledExam"]],
delete__prisma_migrations?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["_prisma_migrations_bool_exp"] | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
delete__prisma_migrations_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["_prisma_migrations"]],
insert_Exam?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Exam_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Exam_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Exam_mutation_response"]],
insert_Exam_one?: [{	/** the row to be inserted */
	object: ValueTypes["Exam_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Exam_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Exam"]],
insert_Group?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Group_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Group_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Group_mutation_response"]],
insert_GroupMember?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["GroupMember_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["GroupMember_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember_mutation_response"]],
insert_GroupMember_one?: [{	/** the row to be inserted */
	object: ValueTypes["GroupMember_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["GroupMember_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember"]],
insert_Group_one?: [{	/** the row to be inserted */
	object: ValueTypes["Group_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Group_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Group"]],
insert_Organization?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Organization_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Organization_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Organization_mutation_response"]],
insert_OrganizationMember?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["OrganizationMember_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["OrganizationMember_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember_mutation_response"]],
insert_OrganizationMember_one?: [{	/** the row to be inserted */
	object: ValueTypes["OrganizationMember_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["OrganizationMember_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember"]],
insert_Organization_one?: [{	/** the row to be inserted */
	object: ValueTypes["Organization_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Organization_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Organization"]],
insert_Profile?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Profile_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Profile_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
insert_Profile_one?: [{	/** the row to be inserted */
	object: ValueTypes["Profile_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Profile_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
insert_Question?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Question_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Question_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Question_mutation_response"]],
insert_Question_one?: [{	/** the row to be inserted */
	object: ValueTypes["Question_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Question_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Question"]],
insert_ScheduledExam?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["ScheduledExam_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["ScheduledExam_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam_mutation_response"]],
insert_ScheduledExam_one?: [{	/** the row to be inserted */
	object: ValueTypes["ScheduledExam_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["ScheduledExam_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
insert__prisma_migrations?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["_prisma_migrations_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["_prisma_migrations_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
insert__prisma_migrations_one?: [{	/** the row to be inserted */
	object: ValueTypes["_prisma_migrations_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["_prisma_migrations_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
update_Exam?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Exam_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Exam_bool_exp"] | Variable<any, string>},ValueTypes["Exam_mutation_response"]],
update_Exam_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Exam_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Exam_pk_columns_input"] | Variable<any, string>},ValueTypes["Exam"]],
update_Exam_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Exam_updates"]> | Variable<any, string>},ValueTypes["Exam_mutation_response"]],
update_Group?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Group_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Group_bool_exp"] | Variable<any, string>},ValueTypes["Group_mutation_response"]],
update_GroupMember?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["GroupMember_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["GroupMember_bool_exp"] | Variable<any, string>},ValueTypes["GroupMember_mutation_response"]],
update_GroupMember_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["GroupMember_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["GroupMember_pk_columns_input"] | Variable<any, string>},ValueTypes["GroupMember"]],
update_GroupMember_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["GroupMember_updates"]> | Variable<any, string>},ValueTypes["GroupMember_mutation_response"]],
update_Group_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Group_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Group_pk_columns_input"] | Variable<any, string>},ValueTypes["Group"]],
update_Group_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Group_updates"]> | Variable<any, string>},ValueTypes["Group_mutation_response"]],
update_Organization?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Organization_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Organization_bool_exp"] | Variable<any, string>},ValueTypes["Organization_mutation_response"]],
update_OrganizationMember?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["OrganizationMember_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["OrganizationMember_bool_exp"] | Variable<any, string>},ValueTypes["OrganizationMember_mutation_response"]],
update_OrganizationMember_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["OrganizationMember_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["OrganizationMember_pk_columns_input"] | Variable<any, string>},ValueTypes["OrganizationMember"]],
update_OrganizationMember_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["OrganizationMember_updates"]> | Variable<any, string>},ValueTypes["OrganizationMember_mutation_response"]],
update_Organization_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Organization_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Organization_pk_columns_input"] | Variable<any, string>},ValueTypes["Organization"]],
update_Organization_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Organization_updates"]> | Variable<any, string>},ValueTypes["Organization_mutation_response"]],
update_Profile?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Profile_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Profile_bool_exp"] | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
update_Profile_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Profile_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Profile_pk_columns_input"] | Variable<any, string>},ValueTypes["Profile"]],
update_Profile_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Profile_updates"]> | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
update_Question?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Question_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Question_bool_exp"] | Variable<any, string>},ValueTypes["Question_mutation_response"]],
update_Question_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Question_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Question_pk_columns_input"] | Variable<any, string>},ValueTypes["Question"]],
update_Question_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Question_updates"]> | Variable<any, string>},ValueTypes["Question_mutation_response"]],
update_ScheduledExam?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["ScheduledExam_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["ScheduledExam_bool_exp"] | Variable<any, string>},ValueTypes["ScheduledExam_mutation_response"]],
update_ScheduledExam_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["ScheduledExam_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["ScheduledExam_pk_columns_input"] | Variable<any, string>},ValueTypes["ScheduledExam"]],
update_ScheduledExam_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["ScheduledExam_updates"]> | Variable<any, string>},ValueTypes["ScheduledExam_mutation_response"]],
update__prisma_migrations?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ValueTypes["_prisma_migrations_inc_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["_prisma_migrations_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["_prisma_migrations_bool_exp"] | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
update__prisma_migrations_by_pk?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ValueTypes["_prisma_migrations_inc_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["_prisma_migrations_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["_prisma_migrations_pk_columns_input"] | Variable<any, string>},ValueTypes["_prisma_migrations"]],
update__prisma_migrations_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["_prisma_migrations_updates"]> | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
		__typename?: boolean | `@${string}`
}>;
	/** column ordering options */
["order_by"]:order_by;
	["query_root"]: AliasType<{
Exam?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Exam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Exam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Exam"]],
Exam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Exam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Exam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Exam_aggregate"]],
Exam_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Exam"]],
Group?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Group_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Group_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Group"]],
GroupMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember"]],
GroupMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember_aggregate"]],
GroupMember_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["GroupMember"]],
Group_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Group_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Group_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Group_aggregate"]],
Group_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Group"]],
Organization?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Organization_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Organization_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Organization"]],
OrganizationMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember"]],
OrganizationMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember_aggregate"]],
OrganizationMember_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["OrganizationMember"]],
Organization_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Organization_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Organization_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Organization_aggregate"]],
Organization_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Organization"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Profile"]],
Question?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Question_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question"]],
Question_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Question_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question_aggregate"]],
Question_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Question"]],
ScheduledExam?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
ScheduledExam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam_aggregate"]],
ScheduledExam_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["ScheduledExam"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["subscription_root"]: AliasType<{
Exam?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Exam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Exam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Exam"]],
Exam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Exam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Exam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Exam_aggregate"]],
Exam_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Exam"]],
Exam_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Exam_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Exam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Exam"]],
Group?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Group_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Group_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Group"]],
GroupMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember"]],
GroupMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["GroupMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["GroupMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember_aggregate"]],
GroupMember_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["GroupMember"]],
GroupMember_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["GroupMember_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["GroupMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["GroupMember"]],
Group_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Group_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Group_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Group_aggregate"]],
Group_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Group"]],
Group_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Group_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Group_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Group"]],
Organization?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Organization_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Organization_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Organization"]],
OrganizationMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember"]],
OrganizationMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["OrganizationMember_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["OrganizationMember_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember_aggregate"]],
OrganizationMember_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["OrganizationMember"]],
OrganizationMember_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["OrganizationMember_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["OrganizationMember_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["OrganizationMember"]],
Organization_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Organization_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Organization_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Organization_aggregate"]],
Organization_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Organization"]],
Organization_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Organization_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Organization_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Organization"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Profile"]],
Profile_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Profile_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
Question?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Question_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question"]],
Question_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Question_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Question_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question_aggregate"]],
Question_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["Question"]],
Question_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Question_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Question_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Question"]],
ScheduledExam?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
ScheduledExam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["ScheduledExam_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["ScheduledExam_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam_aggregate"]],
ScheduledExam_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["ScheduledExam"]],
ScheduledExam_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["ScheduledExam_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["ScheduledExam_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["ScheduledExam"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["_prisma_migrations"]],
_prisma_migrations_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["_prisma_migrations_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["timestamp"]:unknown;
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
	_eq?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["timestamp"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["timestamp"]> | undefined | null | Variable<any, string>
};
	["timestamptz"]:unknown;
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
	_eq?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["timestamptz"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["timestamptz"]> | undefined | null | Variable<any, string>
}
  }

export type ResolverInputTypes = {
    ["schema"]: AliasType<{
	query?:ResolverInputTypes["query_root"],
	mutation?:ResolverInputTypes["mutation_root"],
	subscription?:ResolverInputTypes["subscription_root"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_array_comparison_exp"]: {
	/** is the array contained in the given array value */
	_contained_in?: Array<boolean> | undefined | null,
	/** does the array contain the given value */
	_contains?: Array<boolean> | undefined | null,
	_eq?: Array<boolean> | undefined | null,
	_gt?: Array<boolean> | undefined | null,
	_gte?: Array<boolean> | undefined | null,
	_in?: Array<Array<boolean> | undefined | null>,
	_is_null?: boolean | undefined | null,
	_lt?: Array<boolean> | undefined | null,
	_lte?: Array<boolean> | undefined | null,
	_neq?: Array<boolean> | undefined | null,
	_nin?: Array<Array<boolean> | undefined | null>
};
	/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_comparison_exp"]: {
	_eq?: boolean | undefined | null,
	_gt?: boolean | undefined | null,
	_gte?: boolean | undefined | null,
	_in?: Array<boolean> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: boolean | undefined | null,
	_lte?: boolean | undefined | null,
	_neq?: boolean | undefined | null,
	_nin?: Array<boolean> | undefined | null
};
	/** columns and relationships of "Exam" */
["Exam"]: AliasType<{
Questions?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Question_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question"]],
Questions_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Question_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question_aggregate"]],
ScheduledExams?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
ScheduledExams_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam_aggregate"]],
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "Exam" */
["Exam_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Exam_aggregate_fields"],
	nodes?:ResolverInputTypes["Exam"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Exam" */
["Exam_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Exam_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Exam_max_fields"],
	min?:ResolverInputTypes["Exam_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Exam". All fields are combined with a logical 'AND'. */
["Exam_bool_exp"]: {
	Questions?: ResolverInputTypes["Question_bool_exp"] | undefined | null,
	Questions_aggregate?: ResolverInputTypes["Question_aggregate_bool_exp"] | undefined | null,
	ScheduledExams?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null,
	ScheduledExams_aggregate?: ResolverInputTypes["ScheduledExam_aggregate_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Exam_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Exam_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Exam_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	description?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Exam" */
["Exam_constraint"]:Exam_constraint;
	/** input type for inserting data into table "Exam" */
["Exam_insert_input"]: {
	Questions?: ResolverInputTypes["Question_arr_rel_insert_input"] | undefined | null,
	ScheduledExams?: ResolverInputTypes["ScheduledExam_arr_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["Exam_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Exam_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Exam" */
["Exam_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Exam"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Exam" */
["Exam_obj_rel_insert_input"]: {
	data: ResolverInputTypes["Exam_insert_input"],
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Exam_on_conflict"] | undefined | null
};
	/** on_conflict condition type for table "Exam" */
["Exam_on_conflict"]: {
	constraint: ResolverInputTypes["Exam_constraint"],
	update_columns: Array<ResolverInputTypes["Exam_update_column"]>,
	where?: ResolverInputTypes["Exam_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Exam". */
["Exam_order_by"]: {
	Questions_aggregate?: ResolverInputTypes["Question_aggregate_order_by"] | undefined | null,
	ScheduledExams_aggregate?: ResolverInputTypes["ScheduledExam_aggregate_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	description?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	name?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Exam */
["Exam_pk_columns_input"]: {
	id: string
};
	/** select columns of table "Exam" */
["Exam_select_column"]:Exam_select_column;
	/** input type for updating data in table "Exam" */
["Exam_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "Exam" */
["Exam_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Exam_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Exam_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "Exam" */
["Exam_update_column"]:Exam_update_column;
	["Exam_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Exam_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Exam_bool_exp"]
};
	/** columns and relationships of "Group" */
["Group"]: AliasType<{
GroupMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember"]],
GroupMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember_aggregate"]],
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
scheduledExamsByGroupId?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
scheduledExamsByGroupId_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam_aggregate"]],
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "GroupMember" */
["GroupMember"]: AliasType<{
	/** An object relationship */
	Group?:ResolverInputTypes["Group"],
	/** An object relationship */
	Profile?:ResolverInputTypes["Profile"],
	created_at?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "GroupMember" */
["GroupMember_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["GroupMember_aggregate_fields"],
	nodes?:ResolverInputTypes["GroupMember"],
		__typename?: boolean | `@${string}`
}>;
	["GroupMember_aggregate_bool_exp"]: {
	count?: ResolverInputTypes["GroupMember_aggregate_bool_exp_count"] | undefined | null
};
	["GroupMember_aggregate_bool_exp_count"]: {
	arguments?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Int_comparison_exp"]
};
	/** aggregate fields of "GroupMember" */
["GroupMember_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["GroupMember_max_fields"],
	min?:ResolverInputTypes["GroupMember_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "GroupMember" */
["GroupMember_aggregate_order_by"]: {
	count?: ResolverInputTypes["order_by"] | undefined | null,
	max?: ResolverInputTypes["GroupMember_max_order_by"] | undefined | null,
	min?: ResolverInputTypes["GroupMember_min_order_by"] | undefined | null
};
	/** input type for inserting array relation for remote table "GroupMember" */
["GroupMember_arr_rel_insert_input"]: {
	data: Array<ResolverInputTypes["GroupMember_insert_input"]>,
	/** upsert condition */
	on_conflict?: ResolverInputTypes["GroupMember_on_conflict"] | undefined | null
};
	/** Boolean expression to filter rows from the table "GroupMember". All fields are combined with a logical 'AND'. */
["GroupMember_bool_exp"]: {
	Group?: ResolverInputTypes["Group_bool_exp"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["GroupMember_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["GroupMember_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	group_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	profile_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "GroupMember" */
["GroupMember_constraint"]:GroupMember_constraint;
	/** input type for inserting data into table "GroupMember" */
["GroupMember_insert_input"]: {
	Group?: ResolverInputTypes["Group_obj_rel_insert_input"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_obj_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	group_id?: string | undefined | null,
	id?: string | undefined | null,
	profile_id?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["GroupMember_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "GroupMember" */
["GroupMember_max_order_by"]: {
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	group_id?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** aggregate min on columns */
["GroupMember_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "GroupMember" */
["GroupMember_min_order_by"]: {
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	group_id?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** response of any mutation on the table "GroupMember" */
["GroupMember_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["GroupMember"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "GroupMember" */
["GroupMember_on_conflict"]: {
	constraint: ResolverInputTypes["GroupMember_constraint"],
	update_columns: Array<ResolverInputTypes["GroupMember_update_column"]>,
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "GroupMember". */
["GroupMember_order_by"]: {
	Group?: ResolverInputTypes["Group_order_by"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	group_id?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: GroupMember */
["GroupMember_pk_columns_input"]: {
	id: string
};
	/** select columns of table "GroupMember" */
["GroupMember_select_column"]:GroupMember_select_column;
	/** input type for updating data in table "GroupMember" */
["GroupMember_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	group_id?: string | undefined | null,
	id?: string | undefined | null,
	profile_id?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "GroupMember" */
["GroupMember_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["GroupMember_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["GroupMember_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	group_id?: string | undefined | null,
	id?: string | undefined | null,
	profile_id?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "GroupMember" */
["GroupMember_update_column"]:GroupMember_update_column;
	["GroupMember_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["GroupMember_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["GroupMember_bool_exp"]
};
	/** aggregated selection of "Group" */
["Group_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Group_aggregate_fields"],
	nodes?:ResolverInputTypes["Group"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Group" */
["Group_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Group_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Group_max_fields"],
	min?:ResolverInputTypes["Group_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Group". All fields are combined with a logical 'AND'. */
["Group_bool_exp"]: {
	GroupMembers?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null,
	GroupMembers_aggregate?: ResolverInputTypes["GroupMember_aggregate_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Group_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Group_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Group_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	description?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	email?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	phone?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	picture_url?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	scheduledExamsByGroupId?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null,
	scheduledExamsByGroupId_aggregate?: ResolverInputTypes["ScheduledExam_aggregate_bool_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	website?: ResolverInputTypes["String_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Group" */
["Group_constraint"]:Group_constraint;
	/** input type for inserting data into table "Group" */
["Group_insert_input"]: {
	GroupMembers?: ResolverInputTypes["GroupMember_arr_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	email?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	scheduledExamsByGroupId?: ResolverInputTypes["ScheduledExam_arr_rel_insert_input"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null,
	website?: string | undefined | null
};
	/** aggregate max on columns */
["Group_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Group_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Group" */
["Group_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Group"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Group" */
["Group_obj_rel_insert_input"]: {
	data: ResolverInputTypes["Group_insert_input"],
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Group_on_conflict"] | undefined | null
};
	/** on_conflict condition type for table "Group" */
["Group_on_conflict"]: {
	constraint: ResolverInputTypes["Group_constraint"],
	update_columns: Array<ResolverInputTypes["Group_update_column"]>,
	where?: ResolverInputTypes["Group_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Group". */
["Group_order_by"]: {
	GroupMembers_aggregate?: ResolverInputTypes["GroupMember_aggregate_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	description?: ResolverInputTypes["order_by"] | undefined | null,
	email?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	name?: ResolverInputTypes["order_by"] | undefined | null,
	phone?: ResolverInputTypes["order_by"] | undefined | null,
	picture_url?: ResolverInputTypes["order_by"] | undefined | null,
	scheduledExamsByGroupId_aggregate?: ResolverInputTypes["ScheduledExam_aggregate_order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null,
	website?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Group */
["Group_pk_columns_input"]: {
	id: string
};
	/** select columns of table "Group" */
["Group_select_column"]:Group_select_column;
	/** input type for updating data in table "Group" */
["Group_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	email?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null,
	website?: string | undefined | null
};
	/** Streaming cursor of the table "Group" */
["Group_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Group_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Group_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	email?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null,
	website?: string | undefined | null
};
	/** update columns of table "Group" */
["Group_update_column"]:Group_update_column;
	["Group_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Group_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Group_bool_exp"]
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
	_eq?: number | undefined | null,
	_gt?: number | undefined | null,
	_gte?: number | undefined | null,
	_in?: Array<number> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: number | undefined | null,
	_lte?: number | undefined | null,
	_neq?: number | undefined | null,
	_nin?: Array<number> | undefined | null
};
	/** columns and relationships of "Organization" */
["Organization"]: AliasType<{
OrganizationMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember"]],
OrganizationMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember_aggregate"]],
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "OrganizationMember" */
["OrganizationMember"]: AliasType<{
	/** An object relationship */
	Organization?:ResolverInputTypes["Organization"],
	/** An object relationship */
	Profile?:ResolverInputTypes["Profile"],
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	organization_id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "OrganizationMember" */
["OrganizationMember_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["OrganizationMember_aggregate_fields"],
	nodes?:ResolverInputTypes["OrganizationMember"],
		__typename?: boolean | `@${string}`
}>;
	["OrganizationMember_aggregate_bool_exp"]: {
	count?: ResolverInputTypes["OrganizationMember_aggregate_bool_exp_count"] | undefined | null
};
	["OrganizationMember_aggregate_bool_exp_count"]: {
	arguments?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Int_comparison_exp"]
};
	/** aggregate fields of "OrganizationMember" */
["OrganizationMember_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["OrganizationMember_max_fields"],
	min?:ResolverInputTypes["OrganizationMember_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "OrganizationMember" */
["OrganizationMember_aggregate_order_by"]: {
	count?: ResolverInputTypes["order_by"] | undefined | null,
	max?: ResolverInputTypes["OrganizationMember_max_order_by"] | undefined | null,
	min?: ResolverInputTypes["OrganizationMember_min_order_by"] | undefined | null
};
	/** input type for inserting array relation for remote table "OrganizationMember" */
["OrganizationMember_arr_rel_insert_input"]: {
	data: Array<ResolverInputTypes["OrganizationMember_insert_input"]>,
	/** upsert condition */
	on_conflict?: ResolverInputTypes["OrganizationMember_on_conflict"] | undefined | null
};
	/** Boolean expression to filter rows from the table "OrganizationMember". All fields are combined with a logical 'AND'. */
["OrganizationMember_bool_exp"]: {
	Organization?: ResolverInputTypes["Organization_bool_exp"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["OrganizationMember_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["OrganizationMember_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	organization_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	profile_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	role?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "OrganizationMember" */
["OrganizationMember_constraint"]:OrganizationMember_constraint;
	/** input type for inserting data into table "OrganizationMember" */
["OrganizationMember_insert_input"]: {
	Organization?: ResolverInputTypes["Organization_obj_rel_insert_input"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_obj_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: string | undefined | null,
	organization_id?: string | undefined | null,
	profile_id?: string | undefined | null,
	role?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["OrganizationMember_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	organization_id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "OrganizationMember" */
["OrganizationMember_max_order_by"]: {
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	organization_id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	role?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** aggregate min on columns */
["OrganizationMember_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	organization_id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "OrganizationMember" */
["OrganizationMember_min_order_by"]: {
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	organization_id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	role?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** response of any mutation on the table "OrganizationMember" */
["OrganizationMember_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["OrganizationMember"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "OrganizationMember" */
["OrganizationMember_on_conflict"]: {
	constraint: ResolverInputTypes["OrganizationMember_constraint"],
	update_columns: Array<ResolverInputTypes["OrganizationMember_update_column"]>,
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "OrganizationMember". */
["OrganizationMember_order_by"]: {
	Organization?: ResolverInputTypes["Organization_order_by"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	organization_id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	role?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: OrganizationMember */
["OrganizationMember_pk_columns_input"]: {
	id: string
};
	/** select columns of table "OrganizationMember" */
["OrganizationMember_select_column"]:OrganizationMember_select_column;
	/** input type for updating data in table "OrganizationMember" */
["OrganizationMember_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: string | undefined | null,
	organization_id?: string | undefined | null,
	profile_id?: string | undefined | null,
	role?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "OrganizationMember" */
["OrganizationMember_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["OrganizationMember_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["OrganizationMember_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: string | undefined | null,
	organization_id?: string | undefined | null,
	profile_id?: string | undefined | null,
	role?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "OrganizationMember" */
["OrganizationMember_update_column"]:OrganizationMember_update_column;
	["OrganizationMember_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["OrganizationMember_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["OrganizationMember_bool_exp"]
};
	/** aggregated selection of "Organization" */
["Organization_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Organization_aggregate_fields"],
	nodes?:ResolverInputTypes["Organization"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Organization" */
["Organization_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Organization_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Organization_max_fields"],
	min?:ResolverInputTypes["Organization_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Organization". All fields are combined with a logical 'AND'. */
["Organization_bool_exp"]: {
	OrganizationMembers?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null,
	OrganizationMembers_aggregate?: ResolverInputTypes["OrganizationMember_aggregate_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Organization_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Organization_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Organization_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	description?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	email?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	phone?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	picture_url?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	website?: ResolverInputTypes["String_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Organization" */
["Organization_constraint"]:Organization_constraint;
	/** input type for inserting data into table "Organization" */
["Organization_insert_input"]: {
	OrganizationMembers?: ResolverInputTypes["OrganizationMember_arr_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	email?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null,
	website?: string | undefined | null
};
	/** aggregate max on columns */
["Organization_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Organization_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
	website?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Organization" */
["Organization_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Organization"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Organization" */
["Organization_obj_rel_insert_input"]: {
	data: ResolverInputTypes["Organization_insert_input"],
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Organization_on_conflict"] | undefined | null
};
	/** on_conflict condition type for table "Organization" */
["Organization_on_conflict"]: {
	constraint: ResolverInputTypes["Organization_constraint"],
	update_columns: Array<ResolverInputTypes["Organization_update_column"]>,
	where?: ResolverInputTypes["Organization_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Organization". */
["Organization_order_by"]: {
	OrganizationMembers_aggregate?: ResolverInputTypes["OrganizationMember_aggregate_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	description?: ResolverInputTypes["order_by"] | undefined | null,
	email?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	name?: ResolverInputTypes["order_by"] | undefined | null,
	phone?: ResolverInputTypes["order_by"] | undefined | null,
	picture_url?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null,
	website?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Organization */
["Organization_pk_columns_input"]: {
	id: string
};
	/** select columns of table "Organization" */
["Organization_select_column"]:Organization_select_column;
	/** input type for updating data in table "Organization" */
["Organization_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	email?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null,
	website?: string | undefined | null
};
	/** Streaming cursor of the table "Organization" */
["Organization_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Organization_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Organization_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	description?: string | undefined | null,
	email?: string | undefined | null,
	id?: string | undefined | null,
	name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null,
	website?: string | undefined | null
};
	/** update columns of table "Organization" */
["Organization_update_column"]:Organization_update_column;
	["Organization_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Organization_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Organization_bool_exp"]
};
	/** columns and relationships of "Profile" */
["Profile"]: AliasType<{
GroupMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember"]],
GroupMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember_aggregate"]],
OrganizationMembers?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember"]],
OrganizationMembers_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember_aggregate"]],
ScheduledExams?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
ScheduledExams_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam_aggregate"]],
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Profile_aggregate_fields"],
	nodes?:ResolverInputTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Profile_max_fields"],
	min?:ResolverInputTypes["Profile_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
	GroupMembers?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null,
	GroupMembers_aggregate?: ResolverInputTypes["GroupMember_aggregate_bool_exp"] | undefined | null,
	OrganizationMembers?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null,
	OrganizationMembers_aggregate?: ResolverInputTypes["OrganizationMember_aggregate_bool_exp"] | undefined | null,
	ScheduledExams?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null,
	ScheduledExams_aggregate?: ResolverInputTypes["ScheduledExam_aggregate_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Profile_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Profile_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Profile_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	email?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	first_name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	last_name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	phone?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	picture_url?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Profile" */
["Profile_constraint"]:Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
	GroupMembers?: ResolverInputTypes["GroupMember_arr_rel_insert_input"] | undefined | null,
	OrganizationMembers?: ResolverInputTypes["OrganizationMember_arr_rel_insert_input"] | undefined | null,
	ScheduledExams?: ResolverInputTypes["ScheduledExam_arr_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	email?: string | undefined | null,
	first_name?: string | undefined | null,
	id?: string | undefined | null,
	last_name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["Profile_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Profile_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
	data: ResolverInputTypes["Profile_insert_input"],
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Profile_on_conflict"] | undefined | null
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
	constraint: ResolverInputTypes["Profile_constraint"],
	update_columns: Array<ResolverInputTypes["Profile_update_column"]>,
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
	GroupMembers_aggregate?: ResolverInputTypes["GroupMember_aggregate_order_by"] | undefined | null,
	OrganizationMembers_aggregate?: ResolverInputTypes["OrganizationMember_aggregate_order_by"] | undefined | null,
	ScheduledExams_aggregate?: ResolverInputTypes["ScheduledExam_aggregate_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	email?: ResolverInputTypes["order_by"] | undefined | null,
	first_name?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	last_name?: ResolverInputTypes["order_by"] | undefined | null,
	phone?: ResolverInputTypes["order_by"] | undefined | null,
	picture_url?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
	id: string
};
	/** select columns of table "Profile" */
["Profile_select_column"]:Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	email?: string | undefined | null,
	first_name?: string | undefined | null,
	id?: string | undefined | null,
	last_name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Profile_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	email?: string | undefined | null,
	first_name?: string | undefined | null,
	id?: string | undefined | null,
	last_name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "Profile" */
["Profile_update_column"]:Profile_update_column;
	["Profile_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Profile_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Profile_bool_exp"]
};
	/** columns and relationships of "Question" */
["Question"]: AliasType<{
	/** An object relationship */
	Exam?:ResolverInputTypes["Exam"],
	boolean_expected_answer?:boolean | `@${string}`,
	correct_options?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	expected_answer?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	image_url?:boolean | `@${string}`,
	options?:boolean | `@${string}`,
	question?:boolean | `@${string}`,
	type?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["QuestionType"]:unknown;
	/** Boolean expression to compare columns of type "QuestionType". All fields are combined with logical 'AND'. */
["QuestionType_comparison_exp"]: {
	_eq?: ResolverInputTypes["QuestionType"] | undefined | null,
	_gt?: ResolverInputTypes["QuestionType"] | undefined | null,
	_gte?: ResolverInputTypes["QuestionType"] | undefined | null,
	_in?: Array<ResolverInputTypes["QuestionType"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["QuestionType"] | undefined | null,
	_lte?: ResolverInputTypes["QuestionType"] | undefined | null,
	_neq?: ResolverInputTypes["QuestionType"] | undefined | null,
	_nin?: Array<ResolverInputTypes["QuestionType"]> | undefined | null
};
	/** aggregated selection of "Question" */
["Question_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Question_aggregate_fields"],
	nodes?:ResolverInputTypes["Question"],
		__typename?: boolean | `@${string}`
}>;
	["Question_aggregate_bool_exp"]: {
	bool_and?: ResolverInputTypes["Question_aggregate_bool_exp_bool_and"] | undefined | null,
	bool_or?: ResolverInputTypes["Question_aggregate_bool_exp_bool_or"] | undefined | null,
	count?: ResolverInputTypes["Question_aggregate_bool_exp_count"] | undefined | null
};
	["Question_aggregate_bool_exp_bool_and"]: {
	arguments: ResolverInputTypes["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"],
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["Question_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Boolean_comparison_exp"]
};
	["Question_aggregate_bool_exp_bool_or"]: {
	arguments: ResolverInputTypes["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"],
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["Question_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Boolean_comparison_exp"]
};
	["Question_aggregate_bool_exp_count"]: {
	arguments?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["Question_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Int_comparison_exp"]
};
	/** aggregate fields of "Question" */
["Question_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Question_max_fields"],
	min?:ResolverInputTypes["Question_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "Question" */
["Question_aggregate_order_by"]: {
	count?: ResolverInputTypes["order_by"] | undefined | null,
	max?: ResolverInputTypes["Question_max_order_by"] | undefined | null,
	min?: ResolverInputTypes["Question_min_order_by"] | undefined | null
};
	/** input type for inserting array relation for remote table "Question" */
["Question_arr_rel_insert_input"]: {
	data: Array<ResolverInputTypes["Question_insert_input"]>,
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Question_on_conflict"] | undefined | null
};
	/** Boolean expression to filter rows from the table "Question". All fields are combined with a logical 'AND'. */
["Question_bool_exp"]: {
	Exam?: ResolverInputTypes["Exam_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Question_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Question_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Question_bool_exp"]> | undefined | null,
	boolean_expected_answer?: ResolverInputTypes["Boolean_comparison_exp"] | undefined | null,
	correct_options?: ResolverInputTypes["Boolean_array_comparison_exp"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	exam_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	expected_answer?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	image_url?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	options?: ResolverInputTypes["String_array_comparison_exp"] | undefined | null,
	question?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	type?: ResolverInputTypes["QuestionType_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Question" */
["Question_constraint"]:Question_constraint;
	/** input type for inserting data into table "Question" */
["Question_insert_input"]: {
	Exam?: ResolverInputTypes["Exam_obj_rel_insert_input"] | undefined | null,
	boolean_expected_answer?: boolean | undefined | null,
	correct_options?: Array<boolean> | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	exam_id?: string | undefined | null,
	expected_answer?: string | undefined | null,
	id?: string | undefined | null,
	image_url?: string | undefined | null,
	options?: Array<string> | undefined | null,
	question?: string | undefined | null,
	type?: ResolverInputTypes["QuestionType"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["Question_max_fields"]: AliasType<{
	correct_options?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	expected_answer?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	image_url?:boolean | `@${string}`,
	options?:boolean | `@${string}`,
	question?:boolean | `@${string}`,
	type?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "Question" */
["Question_max_order_by"]: {
	correct_options?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	exam_id?: ResolverInputTypes["order_by"] | undefined | null,
	expected_answer?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	image_url?: ResolverInputTypes["order_by"] | undefined | null,
	options?: ResolverInputTypes["order_by"] | undefined | null,
	question?: ResolverInputTypes["order_by"] | undefined | null,
	type?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** aggregate min on columns */
["Question_min_fields"]: AliasType<{
	correct_options?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	expected_answer?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	image_url?:boolean | `@${string}`,
	options?:boolean | `@${string}`,
	question?:boolean | `@${string}`,
	type?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "Question" */
["Question_min_order_by"]: {
	correct_options?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	exam_id?: ResolverInputTypes["order_by"] | undefined | null,
	expected_answer?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	image_url?: ResolverInputTypes["order_by"] | undefined | null,
	options?: ResolverInputTypes["order_by"] | undefined | null,
	question?: ResolverInputTypes["order_by"] | undefined | null,
	type?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** response of any mutation on the table "Question" */
["Question_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Question"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "Question" */
["Question_on_conflict"]: {
	constraint: ResolverInputTypes["Question_constraint"],
	update_columns: Array<ResolverInputTypes["Question_update_column"]>,
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Question". */
["Question_order_by"]: {
	Exam?: ResolverInputTypes["Exam_order_by"] | undefined | null,
	boolean_expected_answer?: ResolverInputTypes["order_by"] | undefined | null,
	correct_options?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	exam_id?: ResolverInputTypes["order_by"] | undefined | null,
	expected_answer?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	image_url?: ResolverInputTypes["order_by"] | undefined | null,
	options?: ResolverInputTypes["order_by"] | undefined | null,
	question?: ResolverInputTypes["order_by"] | undefined | null,
	type?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Question */
["Question_pk_columns_input"]: {
	id: string
};
	/** select columns of table "Question" */
["Question_select_column"]:Question_select_column;
	/** select "Question_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Question" */
["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"]:Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns;
	/** select "Question_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Question" */
["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"]:Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns;
	/** input type for updating data in table "Question" */
["Question_set_input"]: {
	boolean_expected_answer?: boolean | undefined | null,
	correct_options?: Array<boolean> | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	exam_id?: string | undefined | null,
	expected_answer?: string | undefined | null,
	id?: string | undefined | null,
	image_url?: string | undefined | null,
	options?: Array<string> | undefined | null,
	question?: string | undefined | null,
	type?: ResolverInputTypes["QuestionType"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "Question" */
["Question_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Question_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Question_stream_cursor_value_input"]: {
	boolean_expected_answer?: boolean | undefined | null,
	correct_options?: Array<boolean> | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	exam_id?: string | undefined | null,
	expected_answer?: string | undefined | null,
	id?: string | undefined | null,
	image_url?: string | undefined | null,
	options?: Array<string> | undefined | null,
	question?: string | undefined | null,
	type?: ResolverInputTypes["QuestionType"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "Question" */
["Question_update_column"]:Question_update_column;
	["Question_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Question_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Question_bool_exp"]
};
	/** columns and relationships of "ScheduledExam" */
["ScheduledExam"]: AliasType<{
	/** An object relationship */
	Profile?:ResolverInputTypes["Profile"],
	created_at?:boolean | `@${string}`,
	end_time?:boolean | `@${string}`,
	/** An object relationship */
	examByExamId?:ResolverInputTypes["Exam"],
	exam_id?:boolean | `@${string}`,
	/** An object relationship */
	groupByGroupId?:ResolverInputTypes["Group"],
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	start_time?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "ScheduledExam" */
["ScheduledExam_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["ScheduledExam_aggregate_fields"],
	nodes?:ResolverInputTypes["ScheduledExam"],
		__typename?: boolean | `@${string}`
}>;
	["ScheduledExam_aggregate_bool_exp"]: {
	count?: ResolverInputTypes["ScheduledExam_aggregate_bool_exp_count"] | undefined | null
};
	["ScheduledExam_aggregate_bool_exp_count"]: {
	arguments?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Int_comparison_exp"]
};
	/** aggregate fields of "ScheduledExam" */
["ScheduledExam_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["ScheduledExam_max_fields"],
	min?:ResolverInputTypes["ScheduledExam_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "ScheduledExam" */
["ScheduledExam_aggregate_order_by"]: {
	count?: ResolverInputTypes["order_by"] | undefined | null,
	max?: ResolverInputTypes["ScheduledExam_max_order_by"] | undefined | null,
	min?: ResolverInputTypes["ScheduledExam_min_order_by"] | undefined | null
};
	/** input type for inserting array relation for remote table "ScheduledExam" */
["ScheduledExam_arr_rel_insert_input"]: {
	data: Array<ResolverInputTypes["ScheduledExam_insert_input"]>,
	/** upsert condition */
	on_conflict?: ResolverInputTypes["ScheduledExam_on_conflict"] | undefined | null
};
	/** Boolean expression to filter rows from the table "ScheduledExam". All fields are combined with a logical 'AND'. */
["ScheduledExam_bool_exp"]: {
	Profile?: ResolverInputTypes["Profile_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["ScheduledExam_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["ScheduledExam_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	end_time?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	examByExamId?: ResolverInputTypes["Exam_bool_exp"] | undefined | null,
	exam_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	groupByGroupId?: ResolverInputTypes["Group_bool_exp"] | undefined | null,
	group_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	profile_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	start_time?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "ScheduledExam" */
["ScheduledExam_constraint"]:ScheduledExam_constraint;
	/** input type for inserting data into table "ScheduledExam" */
["ScheduledExam_insert_input"]: {
	Profile?: ResolverInputTypes["Profile_obj_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	end_time?: ResolverInputTypes["timestamp"] | undefined | null,
	examByExamId?: ResolverInputTypes["Exam_obj_rel_insert_input"] | undefined | null,
	exam_id?: string | undefined | null,
	groupByGroupId?: ResolverInputTypes["Group_obj_rel_insert_input"] | undefined | null,
	group_id?: string | undefined | null,
	id?: string | undefined | null,
	profile_id?: string | undefined | null,
	start_time?: ResolverInputTypes["timestamp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["ScheduledExam_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	end_time?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	start_time?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "ScheduledExam" */
["ScheduledExam_max_order_by"]: {
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	end_time?: ResolverInputTypes["order_by"] | undefined | null,
	exam_id?: ResolverInputTypes["order_by"] | undefined | null,
	group_id?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	start_time?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** aggregate min on columns */
["ScheduledExam_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	end_time?:boolean | `@${string}`,
	exam_id?:boolean | `@${string}`,
	group_id?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	start_time?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "ScheduledExam" */
["ScheduledExam_min_order_by"]: {
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	end_time?: ResolverInputTypes["order_by"] | undefined | null,
	exam_id?: ResolverInputTypes["order_by"] | undefined | null,
	group_id?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	start_time?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** response of any mutation on the table "ScheduledExam" */
["ScheduledExam_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["ScheduledExam"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "ScheduledExam" */
["ScheduledExam_on_conflict"]: {
	constraint: ResolverInputTypes["ScheduledExam_constraint"],
	update_columns: Array<ResolverInputTypes["ScheduledExam_update_column"]>,
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "ScheduledExam". */
["ScheduledExam_order_by"]: {
	Profile?: ResolverInputTypes["Profile_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	end_time?: ResolverInputTypes["order_by"] | undefined | null,
	examByExamId?: ResolverInputTypes["Exam_order_by"] | undefined | null,
	exam_id?: ResolverInputTypes["order_by"] | undefined | null,
	groupByGroupId?: ResolverInputTypes["Group_order_by"] | undefined | null,
	group_id?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	start_time?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: ScheduledExam */
["ScheduledExam_pk_columns_input"]: {
	id: string
};
	/** select columns of table "ScheduledExam" */
["ScheduledExam_select_column"]:ScheduledExam_select_column;
	/** input type for updating data in table "ScheduledExam" */
["ScheduledExam_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	end_time?: ResolverInputTypes["timestamp"] | undefined | null,
	exam_id?: string | undefined | null,
	group_id?: string | undefined | null,
	id?: string | undefined | null,
	profile_id?: string | undefined | null,
	start_time?: ResolverInputTypes["timestamp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "ScheduledExam" */
["ScheduledExam_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["ScheduledExam_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["ScheduledExam_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	end_time?: ResolverInputTypes["timestamp"] | undefined | null,
	exam_id?: string | undefined | null,
	group_id?: string | undefined | null,
	id?: string | undefined | null,
	profile_id?: string | undefined | null,
	start_time?: ResolverInputTypes["timestamp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "ScheduledExam" */
["ScheduledExam_update_column"]:ScheduledExam_update_column;
	["ScheduledExam_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["ScheduledExam_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["ScheduledExam_bool_exp"]
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_array_comparison_exp"]: {
	/** is the array contained in the given array value */
	_contained_in?: Array<string> | undefined | null,
	/** does the array contain the given value */
	_contains?: Array<string> | undefined | null,
	_eq?: Array<string> | undefined | null,
	_gt?: Array<string> | undefined | null,
	_gte?: Array<string> | undefined | null,
	_in?: Array<Array<string> | undefined | null>,
	_is_null?: boolean | undefined | null,
	_lt?: Array<string> | undefined | null,
	_lte?: Array<string> | undefined | null,
	_neq?: Array<string> | undefined | null,
	_nin?: Array<Array<string> | undefined | null>
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
	_eq?: string | undefined | null,
	_gt?: string | undefined | null,
	_gte?: string | undefined | null,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined | null,
	_in?: Array<string> | undefined | null,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined | null,
	_is_null?: boolean | undefined | null,
	/** does the column match the given pattern */
	_like?: string | undefined | null,
	_lt?: string | undefined | null,
	_lte?: string | undefined | null,
	_neq?: string | undefined | null,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined | null,
	_nin?: Array<string> | undefined | null,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined | null,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined | null,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined | null,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined | null,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined | null,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined | null
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["_prisma_migrations_aggregate_fields"],
	nodes?:ResolverInputTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: AliasType<{
	avg?:ResolverInputTypes["_prisma_migrations_avg_fields"],
count?: [{	columns?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["_prisma_migrations_max_fields"],
	min?:ResolverInputTypes["_prisma_migrations_min_fields"],
	stddev?:ResolverInputTypes["_prisma_migrations_stddev_fields"],
	stddev_pop?:ResolverInputTypes["_prisma_migrations_stddev_pop_fields"],
	stddev_samp?:ResolverInputTypes["_prisma_migrations_stddev_samp_fields"],
	sum?:ResolverInputTypes["_prisma_migrations_sum_fields"],
	var_pop?:ResolverInputTypes["_prisma_migrations_var_pop_fields"],
	var_samp?:ResolverInputTypes["_prisma_migrations_var_samp_fields"],
	variance?:ResolverInputTypes["_prisma_migrations_variance_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
	_and?: Array<ResolverInputTypes["_prisma_migrations_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["_prisma_migrations_bool_exp"]> | undefined | null,
	applied_steps_count?: ResolverInputTypes["Int_comparison_exp"] | undefined | null,
	checksum?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	logs?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	migration_name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz_comparison_exp"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "_prisma_migrations" */
["_prisma_migrations_constraint"]:_prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
	applied_steps_count?: number | undefined | null
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
	applied_steps_count?: number | undefined | null,
	checksum?: string | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	id?: string | undefined | null,
	logs?: string | undefined | null,
	migration_name?: string | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz"] | undefined | null
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
	constraint: ResolverInputTypes["_prisma_migrations_constraint"],
	update_columns: Array<ResolverInputTypes["_prisma_migrations_update_column"]>,
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
	applied_steps_count?: ResolverInputTypes["order_by"] | undefined | null,
	checksum?: ResolverInputTypes["order_by"] | undefined | null,
	finished_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	logs?: ResolverInputTypes["order_by"] | undefined | null,
	migration_name?: ResolverInputTypes["order_by"] | undefined | null,
	rolled_back_at?: ResolverInputTypes["order_by"] | undefined | null,
	started_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
	id: string
};
	/** select columns of table "_prisma_migrations" */
["_prisma_migrations_select_column"]:_prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
	applied_steps_count?: number | undefined | null,
	checksum?: string | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	id?: string | undefined | null,
	logs?: string | undefined | null,
	migration_name?: string | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz"] | undefined | null
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["_prisma_migrations_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
	applied_steps_count?: number | undefined | null,
	checksum?: string | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	id?: string | undefined | null,
	logs?: string | undefined | null,
	migration_name?: string | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz"] | undefined | null
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** update columns of table "_prisma_migrations" */
["_prisma_migrations_update_column"]:_prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: ResolverInputTypes["_prisma_migrations_inc_input"] | undefined | null,
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["_prisma_migrations_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["_prisma_migrations_bool_exp"]
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** ordering argument of a cursor */
["cursor_ordering"]:cursor_ordering;
	/** mutation root */
["mutation_root"]: AliasType<{
delete_Exam?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Exam_bool_exp"]},ResolverInputTypes["Exam_mutation_response"]],
delete_Exam_by_pk?: [{	id: string},ResolverInputTypes["Exam"]],
delete_Group?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Group_bool_exp"]},ResolverInputTypes["Group_mutation_response"]],
delete_GroupMember?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["GroupMember_bool_exp"]},ResolverInputTypes["GroupMember_mutation_response"]],
delete_GroupMember_by_pk?: [{	id: string},ResolverInputTypes["GroupMember"]],
delete_Group_by_pk?: [{	id: string},ResolverInputTypes["Group"]],
delete_Organization?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Organization_bool_exp"]},ResolverInputTypes["Organization_mutation_response"]],
delete_OrganizationMember?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["OrganizationMember_bool_exp"]},ResolverInputTypes["OrganizationMember_mutation_response"]],
delete_OrganizationMember_by_pk?: [{	id: string},ResolverInputTypes["OrganizationMember"]],
delete_Organization_by_pk?: [{	id: string},ResolverInputTypes["Organization"]],
delete_Profile?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Profile_bool_exp"]},ResolverInputTypes["Profile_mutation_response"]],
delete_Profile_by_pk?: [{	id: string},ResolverInputTypes["Profile"]],
delete_Question?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Question_bool_exp"]},ResolverInputTypes["Question_mutation_response"]],
delete_Question_by_pk?: [{	id: string},ResolverInputTypes["Question"]],
delete_ScheduledExam?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["ScheduledExam_bool_exp"]},ResolverInputTypes["ScheduledExam_mutation_response"]],
delete_ScheduledExam_by_pk?: [{	id: string},ResolverInputTypes["ScheduledExam"]],
delete__prisma_migrations?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["_prisma_migrations_bool_exp"]},ResolverInputTypes["_prisma_migrations_mutation_response"]],
delete__prisma_migrations_by_pk?: [{	id: string},ResolverInputTypes["_prisma_migrations"]],
insert_Exam?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Exam_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Exam_on_conflict"] | undefined | null},ResolverInputTypes["Exam_mutation_response"]],
insert_Exam_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Exam_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Exam_on_conflict"] | undefined | null},ResolverInputTypes["Exam"]],
insert_Group?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Group_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Group_on_conflict"] | undefined | null},ResolverInputTypes["Group_mutation_response"]],
insert_GroupMember?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["GroupMember_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["GroupMember_on_conflict"] | undefined | null},ResolverInputTypes["GroupMember_mutation_response"]],
insert_GroupMember_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["GroupMember_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["GroupMember_on_conflict"] | undefined | null},ResolverInputTypes["GroupMember"]],
insert_Group_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Group_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Group_on_conflict"] | undefined | null},ResolverInputTypes["Group"]],
insert_Organization?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Organization_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Organization_on_conflict"] | undefined | null},ResolverInputTypes["Organization_mutation_response"]],
insert_OrganizationMember?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["OrganizationMember_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["OrganizationMember_on_conflict"] | undefined | null},ResolverInputTypes["OrganizationMember_mutation_response"]],
insert_OrganizationMember_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["OrganizationMember_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["OrganizationMember_on_conflict"] | undefined | null},ResolverInputTypes["OrganizationMember"]],
insert_Organization_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Organization_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Organization_on_conflict"] | undefined | null},ResolverInputTypes["Organization"]],
insert_Profile?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Profile_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Profile_on_conflict"] | undefined | null},ResolverInputTypes["Profile_mutation_response"]],
insert_Profile_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Profile_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Profile_on_conflict"] | undefined | null},ResolverInputTypes["Profile"]],
insert_Question?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Question_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Question_on_conflict"] | undefined | null},ResolverInputTypes["Question_mutation_response"]],
insert_Question_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Question_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Question_on_conflict"] | undefined | null},ResolverInputTypes["Question"]],
insert_ScheduledExam?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["ScheduledExam_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["ScheduledExam_on_conflict"] | undefined | null},ResolverInputTypes["ScheduledExam_mutation_response"]],
insert_ScheduledExam_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["ScheduledExam_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["ScheduledExam_on_conflict"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
insert__prisma_migrations?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["_prisma_migrations_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["_prisma_migrations_on_conflict"] | undefined | null},ResolverInputTypes["_prisma_migrations_mutation_response"]],
insert__prisma_migrations_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["_prisma_migrations_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["_prisma_migrations_on_conflict"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
update_Exam?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Exam_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Exam_bool_exp"]},ResolverInputTypes["Exam_mutation_response"]],
update_Exam_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Exam_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Exam_pk_columns_input"]},ResolverInputTypes["Exam"]],
update_Exam_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Exam_updates"]>},ResolverInputTypes["Exam_mutation_response"]],
update_Group?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Group_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Group_bool_exp"]},ResolverInputTypes["Group_mutation_response"]],
update_GroupMember?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["GroupMember_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["GroupMember_bool_exp"]},ResolverInputTypes["GroupMember_mutation_response"]],
update_GroupMember_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["GroupMember_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["GroupMember_pk_columns_input"]},ResolverInputTypes["GroupMember"]],
update_GroupMember_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["GroupMember_updates"]>},ResolverInputTypes["GroupMember_mutation_response"]],
update_Group_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Group_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Group_pk_columns_input"]},ResolverInputTypes["Group"]],
update_Group_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Group_updates"]>},ResolverInputTypes["Group_mutation_response"]],
update_Organization?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Organization_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Organization_bool_exp"]},ResolverInputTypes["Organization_mutation_response"]],
update_OrganizationMember?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["OrganizationMember_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["OrganizationMember_bool_exp"]},ResolverInputTypes["OrganizationMember_mutation_response"]],
update_OrganizationMember_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["OrganizationMember_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["OrganizationMember_pk_columns_input"]},ResolverInputTypes["OrganizationMember"]],
update_OrganizationMember_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["OrganizationMember_updates"]>},ResolverInputTypes["OrganizationMember_mutation_response"]],
update_Organization_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Organization_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Organization_pk_columns_input"]},ResolverInputTypes["Organization"]],
update_Organization_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Organization_updates"]>},ResolverInputTypes["Organization_mutation_response"]],
update_Profile?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Profile_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Profile_bool_exp"]},ResolverInputTypes["Profile_mutation_response"]],
update_Profile_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Profile_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Profile_pk_columns_input"]},ResolverInputTypes["Profile"]],
update_Profile_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Profile_updates"]>},ResolverInputTypes["Profile_mutation_response"]],
update_Question?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Question_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Question_bool_exp"]},ResolverInputTypes["Question_mutation_response"]],
update_Question_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Question_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Question_pk_columns_input"]},ResolverInputTypes["Question"]],
update_Question_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Question_updates"]>},ResolverInputTypes["Question_mutation_response"]],
update_ScheduledExam?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["ScheduledExam_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["ScheduledExam_bool_exp"]},ResolverInputTypes["ScheduledExam_mutation_response"]],
update_ScheduledExam_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["ScheduledExam_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["ScheduledExam_pk_columns_input"]},ResolverInputTypes["ScheduledExam"]],
update_ScheduledExam_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["ScheduledExam_updates"]>},ResolverInputTypes["ScheduledExam_mutation_response"]],
update__prisma_migrations?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ResolverInputTypes["_prisma_migrations_inc_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["_prisma_migrations_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["_prisma_migrations_bool_exp"]},ResolverInputTypes["_prisma_migrations_mutation_response"]],
update__prisma_migrations_by_pk?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ResolverInputTypes["_prisma_migrations_inc_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["_prisma_migrations_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["_prisma_migrations_pk_columns_input"]},ResolverInputTypes["_prisma_migrations"]],
update__prisma_migrations_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["_prisma_migrations_updates"]>},ResolverInputTypes["_prisma_migrations_mutation_response"]],
		__typename?: boolean | `@${string}`
}>;
	/** column ordering options */
["order_by"]:order_by;
	["query_root"]: AliasType<{
Exam?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Exam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Exam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Exam_bool_exp"] | undefined | null},ResolverInputTypes["Exam"]],
Exam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Exam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Exam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Exam_bool_exp"] | undefined | null},ResolverInputTypes["Exam_aggregate"]],
Exam_by_pk?: [{	id: string},ResolverInputTypes["Exam"]],
Group?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Group_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Group_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Group_bool_exp"] | undefined | null},ResolverInputTypes["Group"]],
GroupMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember"]],
GroupMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember_aggregate"]],
GroupMember_by_pk?: [{	id: string},ResolverInputTypes["GroupMember"]],
Group_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Group_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Group_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Group_bool_exp"] | undefined | null},ResolverInputTypes["Group_aggregate"]],
Group_by_pk?: [{	id: string},ResolverInputTypes["Group"]],
Organization?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Organization_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Organization_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Organization_bool_exp"] | undefined | null},ResolverInputTypes["Organization"]],
OrganizationMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember"]],
OrganizationMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember_aggregate"]],
OrganizationMember_by_pk?: [{	id: string},ResolverInputTypes["OrganizationMember"]],
Organization_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Organization_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Organization_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Organization_bool_exp"] | undefined | null},ResolverInputTypes["Organization_aggregate"]],
Organization_by_pk?: [{	id: string},ResolverInputTypes["Organization"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: string},ResolverInputTypes["Profile"]],
Question?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Question_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question"]],
Question_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Question_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question_aggregate"]],
Question_by_pk?: [{	id: string},ResolverInputTypes["Question"]],
ScheduledExam?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
ScheduledExam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam_aggregate"]],
ScheduledExam_by_pk?: [{	id: string},ResolverInputTypes["ScheduledExam"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string},ResolverInputTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["subscription_root"]: AliasType<{
Exam?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Exam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Exam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Exam_bool_exp"] | undefined | null},ResolverInputTypes["Exam"]],
Exam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Exam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Exam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Exam_bool_exp"] | undefined | null},ResolverInputTypes["Exam_aggregate"]],
Exam_by_pk?: [{	id: string},ResolverInputTypes["Exam"]],
Exam_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Exam_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Exam_bool_exp"] | undefined | null},ResolverInputTypes["Exam"]],
Group?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Group_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Group_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Group_bool_exp"] | undefined | null},ResolverInputTypes["Group"]],
GroupMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember"]],
GroupMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["GroupMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["GroupMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember_aggregate"]],
GroupMember_by_pk?: [{	id: string},ResolverInputTypes["GroupMember"]],
GroupMember_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["GroupMember_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["GroupMember_bool_exp"] | undefined | null},ResolverInputTypes["GroupMember"]],
Group_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Group_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Group_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Group_bool_exp"] | undefined | null},ResolverInputTypes["Group_aggregate"]],
Group_by_pk?: [{	id: string},ResolverInputTypes["Group"]],
Group_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Group_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Group_bool_exp"] | undefined | null},ResolverInputTypes["Group"]],
Organization?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Organization_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Organization_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Organization_bool_exp"] | undefined | null},ResolverInputTypes["Organization"]],
OrganizationMember?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember"]],
OrganizationMember_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["OrganizationMember_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["OrganizationMember_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember_aggregate"]],
OrganizationMember_by_pk?: [{	id: string},ResolverInputTypes["OrganizationMember"]],
OrganizationMember_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["OrganizationMember_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["OrganizationMember_bool_exp"] | undefined | null},ResolverInputTypes["OrganizationMember"]],
Organization_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Organization_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Organization_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Organization_bool_exp"] | undefined | null},ResolverInputTypes["Organization_aggregate"]],
Organization_by_pk?: [{	id: string},ResolverInputTypes["Organization"]],
Organization_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Organization_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Organization_bool_exp"] | undefined | null},ResolverInputTypes["Organization"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: string},ResolverInputTypes["Profile"]],
Profile_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Profile_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile"]],
Question?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Question_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question"]],
Question_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Question_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Question_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question_aggregate"]],
Question_by_pk?: [{	id: string},ResolverInputTypes["Question"]],
Question_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Question_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Question_bool_exp"] | undefined | null},ResolverInputTypes["Question"]],
ScheduledExam?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
ScheduledExam_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["ScheduledExam_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["ScheduledExam_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam_aggregate"]],
ScheduledExam_by_pk?: [{	id: string},ResolverInputTypes["ScheduledExam"]],
ScheduledExam_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["ScheduledExam_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["ScheduledExam_bool_exp"] | undefined | null},ResolverInputTypes["ScheduledExam"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string},ResolverInputTypes["_prisma_migrations"]],
_prisma_migrations_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["_prisma_migrations_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["timestamp"]:unknown;
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
	_eq?: ResolverInputTypes["timestamp"] | undefined | null,
	_gt?: ResolverInputTypes["timestamp"] | undefined | null,
	_gte?: ResolverInputTypes["timestamp"] | undefined | null,
	_in?: Array<ResolverInputTypes["timestamp"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["timestamp"] | undefined | null,
	_lte?: ResolverInputTypes["timestamp"] | undefined | null,
	_neq?: ResolverInputTypes["timestamp"] | undefined | null,
	_nin?: Array<ResolverInputTypes["timestamp"]> | undefined | null
};
	["timestamptz"]:unknown;
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
	_eq?: ResolverInputTypes["timestamptz"] | undefined | null,
	_gt?: ResolverInputTypes["timestamptz"] | undefined | null,
	_gte?: ResolverInputTypes["timestamptz"] | undefined | null,
	_in?: Array<ResolverInputTypes["timestamptz"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["timestamptz"] | undefined | null,
	_lte?: ResolverInputTypes["timestamptz"] | undefined | null,
	_neq?: ResolverInputTypes["timestamptz"] | undefined | null,
	_nin?: Array<ResolverInputTypes["timestamptz"]> | undefined | null
}
  }

export type ModelTypes = {
    ["schema"]: {
	query?: ModelTypes["query_root"] | undefined,
	mutation?: ModelTypes["mutation_root"] | undefined,
	subscription?: ModelTypes["subscription_root"] | undefined
};
	/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_array_comparison_exp"]: {
	/** is the array contained in the given array value */
	_contained_in?: Array<boolean> | undefined,
	/** does the array contain the given value */
	_contains?: Array<boolean> | undefined,
	_eq?: Array<boolean> | undefined,
	_gt?: Array<boolean> | undefined,
	_gte?: Array<boolean> | undefined,
	_in?: Array<Array<boolean> | undefined>,
	_is_null?: boolean | undefined,
	_lt?: Array<boolean> | undefined,
	_lte?: Array<boolean> | undefined,
	_neq?: Array<boolean> | undefined,
	_nin?: Array<Array<boolean> | undefined>
};
	/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_comparison_exp"]: {
	_eq?: boolean | undefined,
	_gt?: boolean | undefined,
	_gte?: boolean | undefined,
	_in?: Array<boolean> | undefined,
	_is_null?: boolean | undefined,
	_lt?: boolean | undefined,
	_lte?: boolean | undefined,
	_neq?: boolean | undefined,
	_nin?: Array<boolean> | undefined
};
	/** columns and relationships of "Exam" */
["Exam"]: {
		/** An array relationship */
	Questions: Array<ModelTypes["Question"]>,
	/** An aggregate relationship */
	Questions_aggregate: ModelTypes["Question_aggregate"],
	/** An array relationship */
	ScheduledExams: Array<ModelTypes["ScheduledExam"]>,
	/** An aggregate relationship */
	ScheduledExams_aggregate: ModelTypes["ScheduledExam_aggregate"],
	created_at: ModelTypes["timestamp"],
	description?: string | undefined,
	id: string,
	name: string,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "Exam" */
["Exam_aggregate"]: {
		aggregate?: ModelTypes["Exam_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Exam"]>
};
	/** aggregate fields of "Exam" */
["Exam_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Exam_max_fields"] | undefined,
	min?: ModelTypes["Exam_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Exam". All fields are combined with a logical 'AND'. */
["Exam_bool_exp"]: {
	Questions?: ModelTypes["Question_bool_exp"] | undefined,
	Questions_aggregate?: ModelTypes["Question_aggregate_bool_exp"] | undefined,
	ScheduledExams?: ModelTypes["ScheduledExam_bool_exp"] | undefined,
	ScheduledExams_aggregate?: ModelTypes["ScheduledExam_aggregate_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Exam_bool_exp"]> | undefined,
	_not?: ModelTypes["Exam_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Exam_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	description?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	name?: ModelTypes["String_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["Exam_constraint"]:Exam_constraint;
	/** input type for inserting data into table "Exam" */
["Exam_insert_input"]: {
	Questions?: ModelTypes["Question_arr_rel_insert_input"] | undefined,
	ScheduledExams?: ModelTypes["ScheduledExam_arr_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Exam_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["Exam_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "Exam" */
["Exam_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Exam"]>
};
	/** input type for inserting object relation for remote table "Exam" */
["Exam_obj_rel_insert_input"]: {
	data: ModelTypes["Exam_insert_input"],
	/** upsert condition */
	on_conflict?: ModelTypes["Exam_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Exam" */
["Exam_on_conflict"]: {
	constraint: ModelTypes["Exam_constraint"],
	update_columns: Array<ModelTypes["Exam_update_column"]>,
	where?: ModelTypes["Exam_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Exam". */
["Exam_order_by"]: {
	Questions_aggregate?: ModelTypes["Question_aggregate_order_by"] | undefined,
	ScheduledExams_aggregate?: ModelTypes["ScheduledExam_aggregate_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	description?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	name?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Exam */
["Exam_pk_columns_input"]: {
	id: string
};
	["Exam_select_column"]:Exam_select_column;
	/** input type for updating data in table "Exam" */
["Exam_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Exam" */
["Exam_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Exam_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Exam_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["Exam_update_column"]:Exam_update_column;
	["Exam_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Exam_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Exam_bool_exp"]
};
	/** columns and relationships of "Group" */
["Group"]: {
		/** An array relationship */
	GroupMembers: Array<ModelTypes["GroupMember"]>,
	/** An aggregate relationship */
	GroupMembers_aggregate: ModelTypes["GroupMember_aggregate"],
	created_at: ModelTypes["timestamp"],
	description?: string | undefined,
	email?: string | undefined,
	id: string,
	name: string,
	phone?: string | undefined,
	picture_url?: string | undefined,
	/** An array relationship */
	scheduledExamsByGroupId: Array<ModelTypes["ScheduledExam"]>,
	/** An aggregate relationship */
	scheduledExamsByGroupId_aggregate: ModelTypes["ScheduledExam_aggregate"],
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** columns and relationships of "GroupMember" */
["GroupMember"]: {
		/** An object relationship */
	Group: ModelTypes["Group"],
	/** An object relationship */
	Profile: ModelTypes["Profile"],
	created_at: ModelTypes["timestamp"],
	group_id: string,
	id: string,
	profile_id: string,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "GroupMember" */
["GroupMember_aggregate"]: {
		aggregate?: ModelTypes["GroupMember_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["GroupMember"]>
};
	["GroupMember_aggregate_bool_exp"]: {
	count?: ModelTypes["GroupMember_aggregate_bool_exp_count"] | undefined
};
	["GroupMember_aggregate_bool_exp_count"]: {
	arguments?: Array<ModelTypes["GroupMember_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: ModelTypes["GroupMember_bool_exp"] | undefined,
	predicate: ModelTypes["Int_comparison_exp"]
};
	/** aggregate fields of "GroupMember" */
["GroupMember_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["GroupMember_max_fields"] | undefined,
	min?: ModelTypes["GroupMember_min_fields"] | undefined
};
	/** order by aggregate values of table "GroupMember" */
["GroupMember_aggregate_order_by"]: {
	count?: ModelTypes["order_by"] | undefined,
	max?: ModelTypes["GroupMember_max_order_by"] | undefined,
	min?: ModelTypes["GroupMember_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "GroupMember" */
["GroupMember_arr_rel_insert_input"]: {
	data: Array<ModelTypes["GroupMember_insert_input"]>,
	/** upsert condition */
	on_conflict?: ModelTypes["GroupMember_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "GroupMember". All fields are combined with a logical 'AND'. */
["GroupMember_bool_exp"]: {
	Group?: ModelTypes["Group_bool_exp"] | undefined,
	Profile?: ModelTypes["Profile_bool_exp"] | undefined,
	_and?: Array<ModelTypes["GroupMember_bool_exp"]> | undefined,
	_not?: ModelTypes["GroupMember_bool_exp"] | undefined,
	_or?: Array<ModelTypes["GroupMember_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	group_id?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	profile_id?: ModelTypes["String_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["GroupMember_constraint"]:GroupMember_constraint;
	/** input type for inserting data into table "GroupMember" */
["GroupMember_insert_input"]: {
	Group?: ModelTypes["Group_obj_rel_insert_input"] | undefined,
	Profile?: ModelTypes["Profile_obj_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["GroupMember_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "GroupMember" */
["GroupMember_max_order_by"]: {
	created_at?: ModelTypes["order_by"] | undefined,
	group_id?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["GroupMember_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "GroupMember" */
["GroupMember_min_order_by"]: {
	created_at?: ModelTypes["order_by"] | undefined,
	group_id?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** response of any mutation on the table "GroupMember" */
["GroupMember_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["GroupMember"]>
};
	/** on_conflict condition type for table "GroupMember" */
["GroupMember_on_conflict"]: {
	constraint: ModelTypes["GroupMember_constraint"],
	update_columns: Array<ModelTypes["GroupMember_update_column"]>,
	where?: ModelTypes["GroupMember_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "GroupMember". */
["GroupMember_order_by"]: {
	Group?: ModelTypes["Group_order_by"] | undefined,
	Profile?: ModelTypes["Profile_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	group_id?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: GroupMember */
["GroupMember_pk_columns_input"]: {
	id: string
};
	["GroupMember_select_column"]:GroupMember_select_column;
	/** input type for updating data in table "GroupMember" */
["GroupMember_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "GroupMember" */
["GroupMember_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["GroupMember_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["GroupMember_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["GroupMember_update_column"]:GroupMember_update_column;
	["GroupMember_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["GroupMember_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["GroupMember_bool_exp"]
};
	/** aggregated selection of "Group" */
["Group_aggregate"]: {
		aggregate?: ModelTypes["Group_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Group"]>
};
	/** aggregate fields of "Group" */
["Group_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Group_max_fields"] | undefined,
	min?: ModelTypes["Group_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Group". All fields are combined with a logical 'AND'. */
["Group_bool_exp"]: {
	GroupMembers?: ModelTypes["GroupMember_bool_exp"] | undefined,
	GroupMembers_aggregate?: ModelTypes["GroupMember_aggregate_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Group_bool_exp"]> | undefined,
	_not?: ModelTypes["Group_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Group_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	description?: ModelTypes["String_comparison_exp"] | undefined,
	email?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	name?: ModelTypes["String_comparison_exp"] | undefined,
	phone?: ModelTypes["String_comparison_exp"] | undefined,
	picture_url?: ModelTypes["String_comparison_exp"] | undefined,
	scheduledExamsByGroupId?: ModelTypes["ScheduledExam_bool_exp"] | undefined,
	scheduledExamsByGroupId_aggregate?: ModelTypes["ScheduledExam_aggregate_bool_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	website?: ModelTypes["String_comparison_exp"] | undefined
};
	["Group_constraint"]:Group_constraint;
	/** input type for inserting data into table "Group" */
["Group_insert_input"]: {
	GroupMembers?: ModelTypes["GroupMember_arr_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	scheduledExamsByGroupId?: ModelTypes["ScheduledExam_arr_rel_insert_input"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate max on columns */
["Group_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate min on columns */
["Group_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** response of any mutation on the table "Group" */
["Group_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Group"]>
};
	/** input type for inserting object relation for remote table "Group" */
["Group_obj_rel_insert_input"]: {
	data: ModelTypes["Group_insert_input"],
	/** upsert condition */
	on_conflict?: ModelTypes["Group_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Group" */
["Group_on_conflict"]: {
	constraint: ModelTypes["Group_constraint"],
	update_columns: Array<ModelTypes["Group_update_column"]>,
	where?: ModelTypes["Group_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Group". */
["Group_order_by"]: {
	GroupMembers_aggregate?: ModelTypes["GroupMember_aggregate_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	description?: ModelTypes["order_by"] | undefined,
	email?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	name?: ModelTypes["order_by"] | undefined,
	phone?: ModelTypes["order_by"] | undefined,
	picture_url?: ModelTypes["order_by"] | undefined,
	scheduledExamsByGroupId_aggregate?: ModelTypes["ScheduledExam_aggregate_order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined,
	website?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Group */
["Group_pk_columns_input"]: {
	id: string
};
	["Group_select_column"]:Group_select_column;
	/** input type for updating data in table "Group" */
["Group_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** Streaming cursor of the table "Group" */
["Group_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Group_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Group_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	["Group_update_column"]:Group_update_column;
	["Group_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Group_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Group_bool_exp"]
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
	_eq?: number | undefined,
	_gt?: number | undefined,
	_gte?: number | undefined,
	_in?: Array<number> | undefined,
	_is_null?: boolean | undefined,
	_lt?: number | undefined,
	_lte?: number | undefined,
	_neq?: number | undefined,
	_nin?: Array<number> | undefined
};
	/** columns and relationships of "Organization" */
["Organization"]: {
		/** An array relationship */
	OrganizationMembers: Array<ModelTypes["OrganizationMember"]>,
	/** An aggregate relationship */
	OrganizationMembers_aggregate: ModelTypes["OrganizationMember_aggregate"],
	created_at: ModelTypes["timestamp"],
	description?: string | undefined,
	email?: string | undefined,
	id: string,
	name: string,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** columns and relationships of "OrganizationMember" */
["OrganizationMember"]: {
		/** An object relationship */
	Organization: ModelTypes["Organization"],
	/** An object relationship */
	Profile: ModelTypes["Profile"],
	created_at: ModelTypes["timestamp"],
	id: string,
	organization_id: string,
	profile_id: string,
	role: string,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "OrganizationMember" */
["OrganizationMember_aggregate"]: {
		aggregate?: ModelTypes["OrganizationMember_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["OrganizationMember"]>
};
	["OrganizationMember_aggregate_bool_exp"]: {
	count?: ModelTypes["OrganizationMember_aggregate_bool_exp_count"] | undefined
};
	["OrganizationMember_aggregate_bool_exp_count"]: {
	arguments?: Array<ModelTypes["OrganizationMember_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: ModelTypes["OrganizationMember_bool_exp"] | undefined,
	predicate: ModelTypes["Int_comparison_exp"]
};
	/** aggregate fields of "OrganizationMember" */
["OrganizationMember_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["OrganizationMember_max_fields"] | undefined,
	min?: ModelTypes["OrganizationMember_min_fields"] | undefined
};
	/** order by aggregate values of table "OrganizationMember" */
["OrganizationMember_aggregate_order_by"]: {
	count?: ModelTypes["order_by"] | undefined,
	max?: ModelTypes["OrganizationMember_max_order_by"] | undefined,
	min?: ModelTypes["OrganizationMember_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "OrganizationMember" */
["OrganizationMember_arr_rel_insert_input"]: {
	data: Array<ModelTypes["OrganizationMember_insert_input"]>,
	/** upsert condition */
	on_conflict?: ModelTypes["OrganizationMember_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "OrganizationMember". All fields are combined with a logical 'AND'. */
["OrganizationMember_bool_exp"]: {
	Organization?: ModelTypes["Organization_bool_exp"] | undefined,
	Profile?: ModelTypes["Profile_bool_exp"] | undefined,
	_and?: Array<ModelTypes["OrganizationMember_bool_exp"]> | undefined,
	_not?: ModelTypes["OrganizationMember_bool_exp"] | undefined,
	_or?: Array<ModelTypes["OrganizationMember_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	organization_id?: ModelTypes["String_comparison_exp"] | undefined,
	profile_id?: ModelTypes["String_comparison_exp"] | undefined,
	role?: ModelTypes["String_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["OrganizationMember_constraint"]:OrganizationMember_constraint;
	/** input type for inserting data into table "OrganizationMember" */
["OrganizationMember_insert_input"]: {
	Organization?: ModelTypes["Organization_obj_rel_insert_input"] | undefined,
	Profile?: ModelTypes["Profile_obj_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["OrganizationMember_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "OrganizationMember" */
["OrganizationMember_max_order_by"]: {
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	organization_id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	role?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["OrganizationMember_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "OrganizationMember" */
["OrganizationMember_min_order_by"]: {
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	organization_id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	role?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** response of any mutation on the table "OrganizationMember" */
["OrganizationMember_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["OrganizationMember"]>
};
	/** on_conflict condition type for table "OrganizationMember" */
["OrganizationMember_on_conflict"]: {
	constraint: ModelTypes["OrganizationMember_constraint"],
	update_columns: Array<ModelTypes["OrganizationMember_update_column"]>,
	where?: ModelTypes["OrganizationMember_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "OrganizationMember". */
["OrganizationMember_order_by"]: {
	Organization?: ModelTypes["Organization_order_by"] | undefined,
	Profile?: ModelTypes["Profile_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	organization_id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	role?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: OrganizationMember */
["OrganizationMember_pk_columns_input"]: {
	id: string
};
	["OrganizationMember_select_column"]:OrganizationMember_select_column;
	/** input type for updating data in table "OrganizationMember" */
["OrganizationMember_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "OrganizationMember" */
["OrganizationMember_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["OrganizationMember_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["OrganizationMember_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["OrganizationMember_update_column"]:OrganizationMember_update_column;
	["OrganizationMember_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["OrganizationMember_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["OrganizationMember_bool_exp"]
};
	/** aggregated selection of "Organization" */
["Organization_aggregate"]: {
		aggregate?: ModelTypes["Organization_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Organization"]>
};
	/** aggregate fields of "Organization" */
["Organization_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Organization_max_fields"] | undefined,
	min?: ModelTypes["Organization_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Organization". All fields are combined with a logical 'AND'. */
["Organization_bool_exp"]: {
	OrganizationMembers?: ModelTypes["OrganizationMember_bool_exp"] | undefined,
	OrganizationMembers_aggregate?: ModelTypes["OrganizationMember_aggregate_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Organization_bool_exp"]> | undefined,
	_not?: ModelTypes["Organization_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Organization_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	description?: ModelTypes["String_comparison_exp"] | undefined,
	email?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	name?: ModelTypes["String_comparison_exp"] | undefined,
	phone?: ModelTypes["String_comparison_exp"] | undefined,
	picture_url?: ModelTypes["String_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	website?: ModelTypes["String_comparison_exp"] | undefined
};
	["Organization_constraint"]:Organization_constraint;
	/** input type for inserting data into table "Organization" */
["Organization_insert_input"]: {
	OrganizationMembers?: ModelTypes["OrganizationMember_arr_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate max on columns */
["Organization_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate min on columns */
["Organization_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** response of any mutation on the table "Organization" */
["Organization_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Organization"]>
};
	/** input type for inserting object relation for remote table "Organization" */
["Organization_obj_rel_insert_input"]: {
	data: ModelTypes["Organization_insert_input"],
	/** upsert condition */
	on_conflict?: ModelTypes["Organization_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Organization" */
["Organization_on_conflict"]: {
	constraint: ModelTypes["Organization_constraint"],
	update_columns: Array<ModelTypes["Organization_update_column"]>,
	where?: ModelTypes["Organization_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Organization". */
["Organization_order_by"]: {
	OrganizationMembers_aggregate?: ModelTypes["OrganizationMember_aggregate_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	description?: ModelTypes["order_by"] | undefined,
	email?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	name?: ModelTypes["order_by"] | undefined,
	phone?: ModelTypes["order_by"] | undefined,
	picture_url?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined,
	website?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Organization */
["Organization_pk_columns_input"]: {
	id: string
};
	["Organization_select_column"]:Organization_select_column;
	/** input type for updating data in table "Organization" */
["Organization_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** Streaming cursor of the table "Organization" */
["Organization_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Organization_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Organization_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined,
	website?: string | undefined
};
	["Organization_update_column"]:Organization_update_column;
	["Organization_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Organization_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Organization_bool_exp"]
};
	/** columns and relationships of "Profile" */
["Profile"]: {
		/** An array relationship */
	GroupMembers: Array<ModelTypes["GroupMember"]>,
	/** An aggregate relationship */
	GroupMembers_aggregate: ModelTypes["GroupMember_aggregate"],
	/** An array relationship */
	OrganizationMembers: Array<ModelTypes["OrganizationMember"]>,
	/** An aggregate relationship */
	OrganizationMembers_aggregate: ModelTypes["OrganizationMember_aggregate"],
	/** An array relationship */
	ScheduledExams: Array<ModelTypes["ScheduledExam"]>,
	/** An aggregate relationship */
	ScheduledExams_aggregate: ModelTypes["ScheduledExam_aggregate"],
	created_at: ModelTypes["timestamp"],
	email: string,
	first_name?: string | undefined,
	id: string,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: {
		aggregate?: ModelTypes["Profile_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Profile"]>
};
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Profile_max_fields"] | undefined,
	min?: ModelTypes["Profile_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
	GroupMembers?: ModelTypes["GroupMember_bool_exp"] | undefined,
	GroupMembers_aggregate?: ModelTypes["GroupMember_aggregate_bool_exp"] | undefined,
	OrganizationMembers?: ModelTypes["OrganizationMember_bool_exp"] | undefined,
	OrganizationMembers_aggregate?: ModelTypes["OrganizationMember_aggregate_bool_exp"] | undefined,
	ScheduledExams?: ModelTypes["ScheduledExam_bool_exp"] | undefined,
	ScheduledExams_aggregate?: ModelTypes["ScheduledExam_aggregate_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Profile_bool_exp"]> | undefined,
	_not?: ModelTypes["Profile_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Profile_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	email?: ModelTypes["String_comparison_exp"] | undefined,
	first_name?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	last_name?: ModelTypes["String_comparison_exp"] | undefined,
	phone?: ModelTypes["String_comparison_exp"] | undefined,
	picture_url?: ModelTypes["String_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["Profile_constraint"]:Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
	GroupMembers?: ModelTypes["GroupMember_arr_rel_insert_input"] | undefined,
	OrganizationMembers?: ModelTypes["OrganizationMember_arr_rel_insert_input"] | undefined,
	ScheduledExams?: ModelTypes["ScheduledExam_arr_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Profile_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["Profile_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Profile"]>
};
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
	data: ModelTypes["Profile_insert_input"],
	/** upsert condition */
	on_conflict?: ModelTypes["Profile_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
	constraint: ModelTypes["Profile_constraint"],
	update_columns: Array<ModelTypes["Profile_update_column"]>,
	where?: ModelTypes["Profile_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
	GroupMembers_aggregate?: ModelTypes["GroupMember_aggregate_order_by"] | undefined,
	OrganizationMembers_aggregate?: ModelTypes["OrganizationMember_aggregate_order_by"] | undefined,
	ScheduledExams_aggregate?: ModelTypes["ScheduledExam_aggregate_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	email?: ModelTypes["order_by"] | undefined,
	first_name?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	last_name?: ModelTypes["order_by"] | undefined,
	phone?: ModelTypes["order_by"] | undefined,
	picture_url?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
	id: string
};
	["Profile_select_column"]:Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Profile_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["Profile_update_column"]:Profile_update_column;
	["Profile_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Profile_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Profile_bool_exp"]
};
	/** columns and relationships of "Question" */
["Question"]: {
		/** An object relationship */
	Exam: ModelTypes["Exam"],
	boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at: ModelTypes["timestamp"],
	exam_id: string,
	expected_answer?: string | undefined,
	id: string,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question: string,
	type: ModelTypes["QuestionType"],
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["QuestionType"]:any;
	/** Boolean expression to compare columns of type "QuestionType". All fields are combined with logical 'AND'. */
["QuestionType_comparison_exp"]: {
	_eq?: ModelTypes["QuestionType"] | undefined,
	_gt?: ModelTypes["QuestionType"] | undefined,
	_gte?: ModelTypes["QuestionType"] | undefined,
	_in?: Array<ModelTypes["QuestionType"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["QuestionType"] | undefined,
	_lte?: ModelTypes["QuestionType"] | undefined,
	_neq?: ModelTypes["QuestionType"] | undefined,
	_nin?: Array<ModelTypes["QuestionType"]> | undefined
};
	/** aggregated selection of "Question" */
["Question_aggregate"]: {
		aggregate?: ModelTypes["Question_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Question"]>
};
	["Question_aggregate_bool_exp"]: {
	bool_and?: ModelTypes["Question_aggregate_bool_exp_bool_and"] | undefined,
	bool_or?: ModelTypes["Question_aggregate_bool_exp_bool_or"] | undefined,
	count?: ModelTypes["Question_aggregate_bool_exp_count"] | undefined
};
	["Question_aggregate_bool_exp_bool_and"]: {
	arguments: ModelTypes["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"],
	distinct?: boolean | undefined,
	filter?: ModelTypes["Question_bool_exp"] | undefined,
	predicate: ModelTypes["Boolean_comparison_exp"]
};
	["Question_aggregate_bool_exp_bool_or"]: {
	arguments: ModelTypes["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"],
	distinct?: boolean | undefined,
	filter?: ModelTypes["Question_bool_exp"] | undefined,
	predicate: ModelTypes["Boolean_comparison_exp"]
};
	["Question_aggregate_bool_exp_count"]: {
	arguments?: Array<ModelTypes["Question_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: ModelTypes["Question_bool_exp"] | undefined,
	predicate: ModelTypes["Int_comparison_exp"]
};
	/** aggregate fields of "Question" */
["Question_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Question_max_fields"] | undefined,
	min?: ModelTypes["Question_min_fields"] | undefined
};
	/** order by aggregate values of table "Question" */
["Question_aggregate_order_by"]: {
	count?: ModelTypes["order_by"] | undefined,
	max?: ModelTypes["Question_max_order_by"] | undefined,
	min?: ModelTypes["Question_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "Question" */
["Question_arr_rel_insert_input"]: {
	data: Array<ModelTypes["Question_insert_input"]>,
	/** upsert condition */
	on_conflict?: ModelTypes["Question_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "Question". All fields are combined with a logical 'AND'. */
["Question_bool_exp"]: {
	Exam?: ModelTypes["Exam_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Question_bool_exp"]> | undefined,
	_not?: ModelTypes["Question_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Question_bool_exp"]> | undefined,
	boolean_expected_answer?: ModelTypes["Boolean_comparison_exp"] | undefined,
	correct_options?: ModelTypes["Boolean_array_comparison_exp"] | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	exam_id?: ModelTypes["String_comparison_exp"] | undefined,
	expected_answer?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	image_url?: ModelTypes["String_comparison_exp"] | undefined,
	options?: ModelTypes["String_array_comparison_exp"] | undefined,
	question?: ModelTypes["String_comparison_exp"] | undefined,
	type?: ModelTypes["QuestionType_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["Question_constraint"]:Question_constraint;
	/** input type for inserting data into table "Question" */
["Question_insert_input"]: {
	Exam?: ModelTypes["Exam_obj_rel_insert_input"] | undefined,
	boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: ModelTypes["QuestionType"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Question_max_fields"]: {
		correct_options?: Array<boolean> | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: ModelTypes["QuestionType"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "Question" */
["Question_max_order_by"]: {
	correct_options?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	exam_id?: ModelTypes["order_by"] | undefined,
	expected_answer?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	image_url?: ModelTypes["order_by"] | undefined,
	options?: ModelTypes["order_by"] | undefined,
	question?: ModelTypes["order_by"] | undefined,
	type?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["Question_min_fields"]: {
		correct_options?: Array<boolean> | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: ModelTypes["QuestionType"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "Question" */
["Question_min_order_by"]: {
	correct_options?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	exam_id?: ModelTypes["order_by"] | undefined,
	expected_answer?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	image_url?: ModelTypes["order_by"] | undefined,
	options?: ModelTypes["order_by"] | undefined,
	question?: ModelTypes["order_by"] | undefined,
	type?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** response of any mutation on the table "Question" */
["Question_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Question"]>
};
	/** on_conflict condition type for table "Question" */
["Question_on_conflict"]: {
	constraint: ModelTypes["Question_constraint"],
	update_columns: Array<ModelTypes["Question_update_column"]>,
	where?: ModelTypes["Question_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Question". */
["Question_order_by"]: {
	Exam?: ModelTypes["Exam_order_by"] | undefined,
	boolean_expected_answer?: ModelTypes["order_by"] | undefined,
	correct_options?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	exam_id?: ModelTypes["order_by"] | undefined,
	expected_answer?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	image_url?: ModelTypes["order_by"] | undefined,
	options?: ModelTypes["order_by"] | undefined,
	question?: ModelTypes["order_by"] | undefined,
	type?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Question */
["Question_pk_columns_input"]: {
	id: string
};
	["Question_select_column"]:Question_select_column;
	["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"]:Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns;
	["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"]:Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns;
	/** input type for updating data in table "Question" */
["Question_set_input"]: {
	boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: ModelTypes["QuestionType"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Question" */
["Question_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Question_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Question_stream_cursor_value_input"]: {
	boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: ModelTypes["QuestionType"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["Question_update_column"]:Question_update_column;
	["Question_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Question_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Question_bool_exp"]
};
	/** columns and relationships of "ScheduledExam" */
["ScheduledExam"]: {
		/** An object relationship */
	Profile?: ModelTypes["Profile"] | undefined,
	created_at: ModelTypes["timestamp"],
	end_time: ModelTypes["timestamp"],
	/** An object relationship */
	examByExamId: ModelTypes["Exam"],
	exam_id: string,
	/** An object relationship */
	groupByGroupId?: ModelTypes["Group"] | undefined,
	group_id?: string | undefined,
	id: string,
	profile_id?: string | undefined,
	start_time: ModelTypes["timestamp"],
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "ScheduledExam" */
["ScheduledExam_aggregate"]: {
		aggregate?: ModelTypes["ScheduledExam_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["ScheduledExam"]>
};
	["ScheduledExam_aggregate_bool_exp"]: {
	count?: ModelTypes["ScheduledExam_aggregate_bool_exp_count"] | undefined
};
	["ScheduledExam_aggregate_bool_exp_count"]: {
	arguments?: Array<ModelTypes["ScheduledExam_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: ModelTypes["ScheduledExam_bool_exp"] | undefined,
	predicate: ModelTypes["Int_comparison_exp"]
};
	/** aggregate fields of "ScheduledExam" */
["ScheduledExam_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["ScheduledExam_max_fields"] | undefined,
	min?: ModelTypes["ScheduledExam_min_fields"] | undefined
};
	/** order by aggregate values of table "ScheduledExam" */
["ScheduledExam_aggregate_order_by"]: {
	count?: ModelTypes["order_by"] | undefined,
	max?: ModelTypes["ScheduledExam_max_order_by"] | undefined,
	min?: ModelTypes["ScheduledExam_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "ScheduledExam" */
["ScheduledExam_arr_rel_insert_input"]: {
	data: Array<ModelTypes["ScheduledExam_insert_input"]>,
	/** upsert condition */
	on_conflict?: ModelTypes["ScheduledExam_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "ScheduledExam". All fields are combined with a logical 'AND'. */
["ScheduledExam_bool_exp"]: {
	Profile?: ModelTypes["Profile_bool_exp"] | undefined,
	_and?: Array<ModelTypes["ScheduledExam_bool_exp"]> | undefined,
	_not?: ModelTypes["ScheduledExam_bool_exp"] | undefined,
	_or?: Array<ModelTypes["ScheduledExam_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	end_time?: ModelTypes["timestamp_comparison_exp"] | undefined,
	examByExamId?: ModelTypes["Exam_bool_exp"] | undefined,
	exam_id?: ModelTypes["String_comparison_exp"] | undefined,
	groupByGroupId?: ModelTypes["Group_bool_exp"] | undefined,
	group_id?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	profile_id?: ModelTypes["String_comparison_exp"] | undefined,
	start_time?: ModelTypes["timestamp_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["ScheduledExam_constraint"]:ScheduledExam_constraint;
	/** input type for inserting data into table "ScheduledExam" */
["ScheduledExam_insert_input"]: {
	Profile?: ModelTypes["Profile_obj_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	end_time?: ModelTypes["timestamp"] | undefined,
	examByExamId?: ModelTypes["Exam_obj_rel_insert_input"] | undefined,
	exam_id?: string | undefined,
	groupByGroupId?: ModelTypes["Group_obj_rel_insert_input"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: ModelTypes["timestamp"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["ScheduledExam_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	end_time?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: ModelTypes["timestamp"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "ScheduledExam" */
["ScheduledExam_max_order_by"]: {
	created_at?: ModelTypes["order_by"] | undefined,
	end_time?: ModelTypes["order_by"] | undefined,
	exam_id?: ModelTypes["order_by"] | undefined,
	group_id?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	start_time?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["ScheduledExam_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	end_time?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: ModelTypes["timestamp"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "ScheduledExam" */
["ScheduledExam_min_order_by"]: {
	created_at?: ModelTypes["order_by"] | undefined,
	end_time?: ModelTypes["order_by"] | undefined,
	exam_id?: ModelTypes["order_by"] | undefined,
	group_id?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	start_time?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** response of any mutation on the table "ScheduledExam" */
["ScheduledExam_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["ScheduledExam"]>
};
	/** on_conflict condition type for table "ScheduledExam" */
["ScheduledExam_on_conflict"]: {
	constraint: ModelTypes["ScheduledExam_constraint"],
	update_columns: Array<ModelTypes["ScheduledExam_update_column"]>,
	where?: ModelTypes["ScheduledExam_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "ScheduledExam". */
["ScheduledExam_order_by"]: {
	Profile?: ModelTypes["Profile_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	end_time?: ModelTypes["order_by"] | undefined,
	examByExamId?: ModelTypes["Exam_order_by"] | undefined,
	exam_id?: ModelTypes["order_by"] | undefined,
	groupByGroupId?: ModelTypes["Group_order_by"] | undefined,
	group_id?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	start_time?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: ScheduledExam */
["ScheduledExam_pk_columns_input"]: {
	id: string
};
	["ScheduledExam_select_column"]:ScheduledExam_select_column;
	/** input type for updating data in table "ScheduledExam" */
["ScheduledExam_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	end_time?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: ModelTypes["timestamp"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "ScheduledExam" */
["ScheduledExam_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["ScheduledExam_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["ScheduledExam_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	end_time?: ModelTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: ModelTypes["timestamp"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["ScheduledExam_update_column"]:ScheduledExam_update_column;
	["ScheduledExam_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["ScheduledExam_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["ScheduledExam_bool_exp"]
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_array_comparison_exp"]: {
	/** is the array contained in the given array value */
	_contained_in?: Array<string> | undefined,
	/** does the array contain the given value */
	_contains?: Array<string> | undefined,
	_eq?: Array<string> | undefined,
	_gt?: Array<string> | undefined,
	_gte?: Array<string> | undefined,
	_in?: Array<Array<string> | undefined>,
	_is_null?: boolean | undefined,
	_lt?: Array<string> | undefined,
	_lte?: Array<string> | undefined,
	_neq?: Array<string> | undefined,
	_nin?: Array<Array<string> | undefined>
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
	_eq?: string | undefined,
	_gt?: string | undefined,
	_gte?: string | undefined,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined,
	_in?: Array<string> | undefined,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined,
	_is_null?: boolean | undefined,
	/** does the column match the given pattern */
	_like?: string | undefined,
	_lt?: string | undefined,
	_lte?: string | undefined,
	_neq?: string | undefined,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined,
	_nin?: Array<string> | undefined,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: {
		applied_steps_count: number,
	checksum: string,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id: string,
	logs?: string | undefined,
	migration_name: string,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at: ModelTypes["timestamptz"]
};
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: {
		aggregate?: ModelTypes["_prisma_migrations_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["_prisma_migrations"]>
};
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: {
		avg?: ModelTypes["_prisma_migrations_avg_fields"] | undefined,
	count: number,
	max?: ModelTypes["_prisma_migrations_max_fields"] | undefined,
	min?: ModelTypes["_prisma_migrations_min_fields"] | undefined,
	stddev?: ModelTypes["_prisma_migrations_stddev_fields"] | undefined,
	stddev_pop?: ModelTypes["_prisma_migrations_stddev_pop_fields"] | undefined,
	stddev_samp?: ModelTypes["_prisma_migrations_stddev_samp_fields"] | undefined,
	sum?: ModelTypes["_prisma_migrations_sum_fields"] | undefined,
	var_pop?: ModelTypes["_prisma_migrations_var_pop_fields"] | undefined,
	var_samp?: ModelTypes["_prisma_migrations_var_samp_fields"] | undefined,
	variance?: ModelTypes["_prisma_migrations_variance_fields"] | undefined
};
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: {
		applied_steps_count?: number | undefined
};
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
	_and?: Array<ModelTypes["_prisma_migrations_bool_exp"]> | undefined,
	_not?: ModelTypes["_prisma_migrations_bool_exp"] | undefined,
	_or?: Array<ModelTypes["_prisma_migrations_bool_exp"]> | undefined,
	applied_steps_count?: ModelTypes["Int_comparison_exp"] | undefined,
	checksum?: ModelTypes["String_comparison_exp"] | undefined,
	finished_at?: ModelTypes["timestamptz_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	logs?: ModelTypes["String_comparison_exp"] | undefined,
	migration_name?: ModelTypes["String_comparison_exp"] | undefined,
	rolled_back_at?: ModelTypes["timestamptz_comparison_exp"] | undefined,
	started_at?: ModelTypes["timestamptz_comparison_exp"] | undefined
};
	["_prisma_migrations_constraint"]:_prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
	applied_steps_count?: number | undefined
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["_prisma_migrations"]>
};
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
	constraint: ModelTypes["_prisma_migrations_constraint"],
	update_columns: Array<ModelTypes["_prisma_migrations_update_column"]>,
	where?: ModelTypes["_prisma_migrations_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
	applied_steps_count?: ModelTypes["order_by"] | undefined,
	checksum?: ModelTypes["order_by"] | undefined,
	finished_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	logs?: ModelTypes["order_by"] | undefined,
	migration_name?: ModelTypes["order_by"] | undefined,
	rolled_back_at?: ModelTypes["order_by"] | undefined,
	started_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
	id: string
};
	["_prisma_migrations_select_column"]:_prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: {
		applied_steps_count?: number | undefined
};
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["_prisma_migrations_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: {
		applied_steps_count?: number | undefined
};
	["_prisma_migrations_update_column"]:_prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: ModelTypes["_prisma_migrations_inc_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["_prisma_migrations_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["_prisma_migrations_bool_exp"]
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: {
		applied_steps_count?: number | undefined
};
	["cursor_ordering"]:cursor_ordering;
	/** mutation root */
["mutation_root"]: {
		/** delete data from the table: "Exam" */
	delete_Exam?: ModelTypes["Exam_mutation_response"] | undefined,
	/** delete single row from the table: "Exam" */
	delete_Exam_by_pk?: ModelTypes["Exam"] | undefined,
	/** delete data from the table: "Group" */
	delete_Group?: ModelTypes["Group_mutation_response"] | undefined,
	/** delete data from the table: "GroupMember" */
	delete_GroupMember?: ModelTypes["GroupMember_mutation_response"] | undefined,
	/** delete single row from the table: "GroupMember" */
	delete_GroupMember_by_pk?: ModelTypes["GroupMember"] | undefined,
	/** delete single row from the table: "Group" */
	delete_Group_by_pk?: ModelTypes["Group"] | undefined,
	/** delete data from the table: "Organization" */
	delete_Organization?: ModelTypes["Organization_mutation_response"] | undefined,
	/** delete data from the table: "OrganizationMember" */
	delete_OrganizationMember?: ModelTypes["OrganizationMember_mutation_response"] | undefined,
	/** delete single row from the table: "OrganizationMember" */
	delete_OrganizationMember_by_pk?: ModelTypes["OrganizationMember"] | undefined,
	/** delete single row from the table: "Organization" */
	delete_Organization_by_pk?: ModelTypes["Organization"] | undefined,
	/** delete data from the table: "Profile" */
	delete_Profile?: ModelTypes["Profile_mutation_response"] | undefined,
	/** delete single row from the table: "Profile" */
	delete_Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** delete data from the table: "Question" */
	delete_Question?: ModelTypes["Question_mutation_response"] | undefined,
	/** delete single row from the table: "Question" */
	delete_Question_by_pk?: ModelTypes["Question"] | undefined,
	/** delete data from the table: "ScheduledExam" */
	delete_ScheduledExam?: ModelTypes["ScheduledExam_mutation_response"] | undefined,
	/** delete single row from the table: "ScheduledExam" */
	delete_ScheduledExam_by_pk?: ModelTypes["ScheduledExam"] | undefined,
	/** delete data from the table: "_prisma_migrations" */
	delete__prisma_migrations?: ModelTypes["_prisma_migrations_mutation_response"] | undefined,
	/** delete single row from the table: "_prisma_migrations" */
	delete__prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined,
	/** insert data into the table: "Exam" */
	insert_Exam?: ModelTypes["Exam_mutation_response"] | undefined,
	/** insert a single row into the table: "Exam" */
	insert_Exam_one?: ModelTypes["Exam"] | undefined,
	/** insert data into the table: "Group" */
	insert_Group?: ModelTypes["Group_mutation_response"] | undefined,
	/** insert data into the table: "GroupMember" */
	insert_GroupMember?: ModelTypes["GroupMember_mutation_response"] | undefined,
	/** insert a single row into the table: "GroupMember" */
	insert_GroupMember_one?: ModelTypes["GroupMember"] | undefined,
	/** insert a single row into the table: "Group" */
	insert_Group_one?: ModelTypes["Group"] | undefined,
	/** insert data into the table: "Organization" */
	insert_Organization?: ModelTypes["Organization_mutation_response"] | undefined,
	/** insert data into the table: "OrganizationMember" */
	insert_OrganizationMember?: ModelTypes["OrganizationMember_mutation_response"] | undefined,
	/** insert a single row into the table: "OrganizationMember" */
	insert_OrganizationMember_one?: ModelTypes["OrganizationMember"] | undefined,
	/** insert a single row into the table: "Organization" */
	insert_Organization_one?: ModelTypes["Organization"] | undefined,
	/** insert data into the table: "Profile" */
	insert_Profile?: ModelTypes["Profile_mutation_response"] | undefined,
	/** insert a single row into the table: "Profile" */
	insert_Profile_one?: ModelTypes["Profile"] | undefined,
	/** insert data into the table: "Question" */
	insert_Question?: ModelTypes["Question_mutation_response"] | undefined,
	/** insert a single row into the table: "Question" */
	insert_Question_one?: ModelTypes["Question"] | undefined,
	/** insert data into the table: "ScheduledExam" */
	insert_ScheduledExam?: ModelTypes["ScheduledExam_mutation_response"] | undefined,
	/** insert a single row into the table: "ScheduledExam" */
	insert_ScheduledExam_one?: ModelTypes["ScheduledExam"] | undefined,
	/** insert data into the table: "_prisma_migrations" */
	insert__prisma_migrations?: ModelTypes["_prisma_migrations_mutation_response"] | undefined,
	/** insert a single row into the table: "_prisma_migrations" */
	insert__prisma_migrations_one?: ModelTypes["_prisma_migrations"] | undefined,
	/** update data of the table: "Exam" */
	update_Exam?: ModelTypes["Exam_mutation_response"] | undefined,
	/** update single row of the table: "Exam" */
	update_Exam_by_pk?: ModelTypes["Exam"] | undefined,
	/** update multiples rows of table: "Exam" */
	update_Exam_many?: Array<ModelTypes["Exam_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Group" */
	update_Group?: ModelTypes["Group_mutation_response"] | undefined,
	/** update data of the table: "GroupMember" */
	update_GroupMember?: ModelTypes["GroupMember_mutation_response"] | undefined,
	/** update single row of the table: "GroupMember" */
	update_GroupMember_by_pk?: ModelTypes["GroupMember"] | undefined,
	/** update multiples rows of table: "GroupMember" */
	update_GroupMember_many?: Array<ModelTypes["GroupMember_mutation_response"] | undefined> | undefined,
	/** update single row of the table: "Group" */
	update_Group_by_pk?: ModelTypes["Group"] | undefined,
	/** update multiples rows of table: "Group" */
	update_Group_many?: Array<ModelTypes["Group_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Organization" */
	update_Organization?: ModelTypes["Organization_mutation_response"] | undefined,
	/** update data of the table: "OrganizationMember" */
	update_OrganizationMember?: ModelTypes["OrganizationMember_mutation_response"] | undefined,
	/** update single row of the table: "OrganizationMember" */
	update_OrganizationMember_by_pk?: ModelTypes["OrganizationMember"] | undefined,
	/** update multiples rows of table: "OrganizationMember" */
	update_OrganizationMember_many?: Array<ModelTypes["OrganizationMember_mutation_response"] | undefined> | undefined,
	/** update single row of the table: "Organization" */
	update_Organization_by_pk?: ModelTypes["Organization"] | undefined,
	/** update multiples rows of table: "Organization" */
	update_Organization_many?: Array<ModelTypes["Organization_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Profile" */
	update_Profile?: ModelTypes["Profile_mutation_response"] | undefined,
	/** update single row of the table: "Profile" */
	update_Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** update multiples rows of table: "Profile" */
	update_Profile_many?: Array<ModelTypes["Profile_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Question" */
	update_Question?: ModelTypes["Question_mutation_response"] | undefined,
	/** update single row of the table: "Question" */
	update_Question_by_pk?: ModelTypes["Question"] | undefined,
	/** update multiples rows of table: "Question" */
	update_Question_many?: Array<ModelTypes["Question_mutation_response"] | undefined> | undefined,
	/** update data of the table: "ScheduledExam" */
	update_ScheduledExam?: ModelTypes["ScheduledExam_mutation_response"] | undefined,
	/** update single row of the table: "ScheduledExam" */
	update_ScheduledExam_by_pk?: ModelTypes["ScheduledExam"] | undefined,
	/** update multiples rows of table: "ScheduledExam" */
	update_ScheduledExam_many?: Array<ModelTypes["ScheduledExam_mutation_response"] | undefined> | undefined,
	/** update data of the table: "_prisma_migrations" */
	update__prisma_migrations?: ModelTypes["_prisma_migrations_mutation_response"] | undefined,
	/** update single row of the table: "_prisma_migrations" */
	update__prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined,
	/** update multiples rows of table: "_prisma_migrations" */
	update__prisma_migrations_many?: Array<ModelTypes["_prisma_migrations_mutation_response"] | undefined> | undefined
};
	["order_by"]:order_by;
	["query_root"]: {
		/** fetch data from the table: "Exam" */
	Exam: Array<ModelTypes["Exam"]>,
	/** fetch aggregated fields from the table: "Exam" */
	Exam_aggregate: ModelTypes["Exam_aggregate"],
	/** fetch data from the table: "Exam" using primary key columns */
	Exam_by_pk?: ModelTypes["Exam"] | undefined,
	/** fetch data from the table: "Group" */
	Group: Array<ModelTypes["Group"]>,
	/** fetch data from the table: "GroupMember" */
	GroupMember: Array<ModelTypes["GroupMember"]>,
	/** fetch aggregated fields from the table: "GroupMember" */
	GroupMember_aggregate: ModelTypes["GroupMember_aggregate"],
	/** fetch data from the table: "GroupMember" using primary key columns */
	GroupMember_by_pk?: ModelTypes["GroupMember"] | undefined,
	/** fetch aggregated fields from the table: "Group" */
	Group_aggregate: ModelTypes["Group_aggregate"],
	/** fetch data from the table: "Group" using primary key columns */
	Group_by_pk?: ModelTypes["Group"] | undefined,
	/** fetch data from the table: "Organization" */
	Organization: Array<ModelTypes["Organization"]>,
	/** fetch data from the table: "OrganizationMember" */
	OrganizationMember: Array<ModelTypes["OrganizationMember"]>,
	/** fetch aggregated fields from the table: "OrganizationMember" */
	OrganizationMember_aggregate: ModelTypes["OrganizationMember_aggregate"],
	/** fetch data from the table: "OrganizationMember" using primary key columns */
	OrganizationMember_by_pk?: ModelTypes["OrganizationMember"] | undefined,
	/** fetch aggregated fields from the table: "Organization" */
	Organization_aggregate: ModelTypes["Organization_aggregate"],
	/** fetch data from the table: "Organization" using primary key columns */
	Organization_by_pk?: ModelTypes["Organization"] | undefined,
	/** fetch data from the table: "Profile" */
	Profile: Array<ModelTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: ModelTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** fetch data from the table: "Question" */
	Question: Array<ModelTypes["Question"]>,
	/** fetch aggregated fields from the table: "Question" */
	Question_aggregate: ModelTypes["Question_aggregate"],
	/** fetch data from the table: "Question" using primary key columns */
	Question_by_pk?: ModelTypes["Question"] | undefined,
	/** fetch data from the table: "ScheduledExam" */
	ScheduledExam: Array<ModelTypes["ScheduledExam"]>,
	/** fetch aggregated fields from the table: "ScheduledExam" */
	ScheduledExam_aggregate: ModelTypes["ScheduledExam_aggregate"],
	/** fetch data from the table: "ScheduledExam" using primary key columns */
	ScheduledExam_by_pk?: ModelTypes["ScheduledExam"] | undefined,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<ModelTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: ModelTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined
};
	["subscription_root"]: {
		/** fetch data from the table: "Exam" */
	Exam: Array<ModelTypes["Exam"]>,
	/** fetch aggregated fields from the table: "Exam" */
	Exam_aggregate: ModelTypes["Exam_aggregate"],
	/** fetch data from the table: "Exam" using primary key columns */
	Exam_by_pk?: ModelTypes["Exam"] | undefined,
	/** fetch data from the table in a streaming manner: "Exam" */
	Exam_stream: Array<ModelTypes["Exam"]>,
	/** fetch data from the table: "Group" */
	Group: Array<ModelTypes["Group"]>,
	/** fetch data from the table: "GroupMember" */
	GroupMember: Array<ModelTypes["GroupMember"]>,
	/** fetch aggregated fields from the table: "GroupMember" */
	GroupMember_aggregate: ModelTypes["GroupMember_aggregate"],
	/** fetch data from the table: "GroupMember" using primary key columns */
	GroupMember_by_pk?: ModelTypes["GroupMember"] | undefined,
	/** fetch data from the table in a streaming manner: "GroupMember" */
	GroupMember_stream: Array<ModelTypes["GroupMember"]>,
	/** fetch aggregated fields from the table: "Group" */
	Group_aggregate: ModelTypes["Group_aggregate"],
	/** fetch data from the table: "Group" using primary key columns */
	Group_by_pk?: ModelTypes["Group"] | undefined,
	/** fetch data from the table in a streaming manner: "Group" */
	Group_stream: Array<ModelTypes["Group"]>,
	/** fetch data from the table: "Organization" */
	Organization: Array<ModelTypes["Organization"]>,
	/** fetch data from the table: "OrganizationMember" */
	OrganizationMember: Array<ModelTypes["OrganizationMember"]>,
	/** fetch aggregated fields from the table: "OrganizationMember" */
	OrganizationMember_aggregate: ModelTypes["OrganizationMember_aggregate"],
	/** fetch data from the table: "OrganizationMember" using primary key columns */
	OrganizationMember_by_pk?: ModelTypes["OrganizationMember"] | undefined,
	/** fetch data from the table in a streaming manner: "OrganizationMember" */
	OrganizationMember_stream: Array<ModelTypes["OrganizationMember"]>,
	/** fetch aggregated fields from the table: "Organization" */
	Organization_aggregate: ModelTypes["Organization_aggregate"],
	/** fetch data from the table: "Organization" using primary key columns */
	Organization_by_pk?: ModelTypes["Organization"] | undefined,
	/** fetch data from the table in a streaming manner: "Organization" */
	Organization_stream: Array<ModelTypes["Organization"]>,
	/** fetch data from the table: "Profile" */
	Profile: Array<ModelTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: ModelTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** fetch data from the table in a streaming manner: "Profile" */
	Profile_stream: Array<ModelTypes["Profile"]>,
	/** fetch data from the table: "Question" */
	Question: Array<ModelTypes["Question"]>,
	/** fetch aggregated fields from the table: "Question" */
	Question_aggregate: ModelTypes["Question_aggregate"],
	/** fetch data from the table: "Question" using primary key columns */
	Question_by_pk?: ModelTypes["Question"] | undefined,
	/** fetch data from the table in a streaming manner: "Question" */
	Question_stream: Array<ModelTypes["Question"]>,
	/** fetch data from the table: "ScheduledExam" */
	ScheduledExam: Array<ModelTypes["ScheduledExam"]>,
	/** fetch aggregated fields from the table: "ScheduledExam" */
	ScheduledExam_aggregate: ModelTypes["ScheduledExam_aggregate"],
	/** fetch data from the table: "ScheduledExam" using primary key columns */
	ScheduledExam_by_pk?: ModelTypes["ScheduledExam"] | undefined,
	/** fetch data from the table in a streaming manner: "ScheduledExam" */
	ScheduledExam_stream: Array<ModelTypes["ScheduledExam"]>,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<ModelTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: ModelTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined,
	/** fetch data from the table in a streaming manner: "_prisma_migrations" */
	_prisma_migrations_stream: Array<ModelTypes["_prisma_migrations"]>
};
	["timestamp"]:any;
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
	_eq?: ModelTypes["timestamp"] | undefined,
	_gt?: ModelTypes["timestamp"] | undefined,
	_gte?: ModelTypes["timestamp"] | undefined,
	_in?: Array<ModelTypes["timestamp"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["timestamp"] | undefined,
	_lte?: ModelTypes["timestamp"] | undefined,
	_neq?: ModelTypes["timestamp"] | undefined,
	_nin?: Array<ModelTypes["timestamp"]> | undefined
};
	["timestamptz"]:any;
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
	_eq?: ModelTypes["timestamptz"] | undefined,
	_gt?: ModelTypes["timestamptz"] | undefined,
	_gte?: ModelTypes["timestamptz"] | undefined,
	_in?: Array<ModelTypes["timestamptz"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["timestamptz"] | undefined,
	_lte?: ModelTypes["timestamptz"] | undefined,
	_neq?: ModelTypes["timestamptz"] | undefined,
	_nin?: Array<ModelTypes["timestamptz"]> | undefined
}
    }

export type GraphQLTypes = {
    /** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_array_comparison_exp"]: {
		/** is the array contained in the given array value */
	_contained_in?: Array<boolean> | undefined,
	/** does the array contain the given value */
	_contains?: Array<boolean> | undefined,
	_eq?: Array<boolean> | undefined,
	_gt?: Array<boolean> | undefined,
	_gte?: Array<boolean> | undefined,
	_in?: Array<Array<boolean> | undefined>,
	_is_null?: boolean | undefined,
	_lt?: Array<boolean> | undefined,
	_lte?: Array<boolean> | undefined,
	_neq?: Array<boolean> | undefined,
	_nin?: Array<Array<boolean> | undefined>
};
	/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
["Boolean_comparison_exp"]: {
		_eq?: boolean | undefined,
	_gt?: boolean | undefined,
	_gte?: boolean | undefined,
	_in?: Array<boolean> | undefined,
	_is_null?: boolean | undefined,
	_lt?: boolean | undefined,
	_lte?: boolean | undefined,
	_neq?: boolean | undefined,
	_nin?: Array<boolean> | undefined
};
	/** columns and relationships of "Exam" */
["Exam"]: {
	__typename: "Exam",
	/** An array relationship */
	Questions: Array<GraphQLTypes["Question"]>,
	/** An aggregate relationship */
	Questions_aggregate: GraphQLTypes["Question_aggregate"],
	/** An array relationship */
	ScheduledExams: Array<GraphQLTypes["ScheduledExam"]>,
	/** An aggregate relationship */
	ScheduledExams_aggregate: GraphQLTypes["ScheduledExam_aggregate"],
	created_at: GraphQLTypes["timestamp"],
	description?: string | undefined,
	id: string,
	name: string,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "Exam" */
["Exam_aggregate"]: {
	__typename: "Exam_aggregate",
	aggregate?: GraphQLTypes["Exam_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Exam"]>
};
	/** aggregate fields of "Exam" */
["Exam_aggregate_fields"]: {
	__typename: "Exam_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Exam_max_fields"] | undefined,
	min?: GraphQLTypes["Exam_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Exam". All fields are combined with a logical 'AND'. */
["Exam_bool_exp"]: {
		Questions?: GraphQLTypes["Question_bool_exp"] | undefined,
	Questions_aggregate?: GraphQLTypes["Question_aggregate_bool_exp"] | undefined,
	ScheduledExams?: GraphQLTypes["ScheduledExam_bool_exp"] | undefined,
	ScheduledExams_aggregate?: GraphQLTypes["ScheduledExam_aggregate_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Exam_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Exam_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Exam_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	description?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	name?: GraphQLTypes["String_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Exam" */
["Exam_constraint"]: Exam_constraint;
	/** input type for inserting data into table "Exam" */
["Exam_insert_input"]: {
		Questions?: GraphQLTypes["Question_arr_rel_insert_input"] | undefined,
	ScheduledExams?: GraphQLTypes["ScheduledExam_arr_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Exam_max_fields"]: {
	__typename: "Exam_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["Exam_min_fields"]: {
	__typename: "Exam_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "Exam" */
["Exam_mutation_response"]: {
	__typename: "Exam_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Exam"]>
};
	/** input type for inserting object relation for remote table "Exam" */
["Exam_obj_rel_insert_input"]: {
		data: GraphQLTypes["Exam_insert_input"],
	/** upsert condition */
	on_conflict?: GraphQLTypes["Exam_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Exam" */
["Exam_on_conflict"]: {
		constraint: GraphQLTypes["Exam_constraint"],
	update_columns: Array<GraphQLTypes["Exam_update_column"]>,
	where?: GraphQLTypes["Exam_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Exam". */
["Exam_order_by"]: {
		Questions_aggregate?: GraphQLTypes["Question_aggregate_order_by"] | undefined,
	ScheduledExams_aggregate?: GraphQLTypes["ScheduledExam_aggregate_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	description?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	name?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Exam */
["Exam_pk_columns_input"]: {
		id: string
};
	/** select columns of table "Exam" */
["Exam_select_column"]: Exam_select_column;
	/** input type for updating data in table "Exam" */
["Exam_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Exam" */
["Exam_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Exam_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Exam_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "Exam" */
["Exam_update_column"]: Exam_update_column;
	["Exam_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Exam_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Exam_bool_exp"]
};
	/** columns and relationships of "Group" */
["Group"]: {
	__typename: "Group",
	/** An array relationship */
	GroupMembers: Array<GraphQLTypes["GroupMember"]>,
	/** An aggregate relationship */
	GroupMembers_aggregate: GraphQLTypes["GroupMember_aggregate"],
	created_at: GraphQLTypes["timestamp"],
	description?: string | undefined,
	email?: string | undefined,
	id: string,
	name: string,
	phone?: string | undefined,
	picture_url?: string | undefined,
	/** An array relationship */
	scheduledExamsByGroupId: Array<GraphQLTypes["ScheduledExam"]>,
	/** An aggregate relationship */
	scheduledExamsByGroupId_aggregate: GraphQLTypes["ScheduledExam_aggregate"],
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** columns and relationships of "GroupMember" */
["GroupMember"]: {
	__typename: "GroupMember",
	/** An object relationship */
	Group: GraphQLTypes["Group"],
	/** An object relationship */
	Profile: GraphQLTypes["Profile"],
	created_at: GraphQLTypes["timestamp"],
	group_id: string,
	id: string,
	profile_id: string,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "GroupMember" */
["GroupMember_aggregate"]: {
	__typename: "GroupMember_aggregate",
	aggregate?: GraphQLTypes["GroupMember_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["GroupMember"]>
};
	["GroupMember_aggregate_bool_exp"]: {
		count?: GraphQLTypes["GroupMember_aggregate_bool_exp_count"] | undefined
};
	["GroupMember_aggregate_bool_exp_count"]: {
		arguments?: Array<GraphQLTypes["GroupMember_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["GroupMember_bool_exp"] | undefined,
	predicate: GraphQLTypes["Int_comparison_exp"]
};
	/** aggregate fields of "GroupMember" */
["GroupMember_aggregate_fields"]: {
	__typename: "GroupMember_aggregate_fields",
	count: number,
	max?: GraphQLTypes["GroupMember_max_fields"] | undefined,
	min?: GraphQLTypes["GroupMember_min_fields"] | undefined
};
	/** order by aggregate values of table "GroupMember" */
["GroupMember_aggregate_order_by"]: {
		count?: GraphQLTypes["order_by"] | undefined,
	max?: GraphQLTypes["GroupMember_max_order_by"] | undefined,
	min?: GraphQLTypes["GroupMember_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "GroupMember" */
["GroupMember_arr_rel_insert_input"]: {
		data: Array<GraphQLTypes["GroupMember_insert_input"]>,
	/** upsert condition */
	on_conflict?: GraphQLTypes["GroupMember_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "GroupMember". All fields are combined with a logical 'AND'. */
["GroupMember_bool_exp"]: {
		Group?: GraphQLTypes["Group_bool_exp"] | undefined,
	Profile?: GraphQLTypes["Profile_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["GroupMember_bool_exp"]> | undefined,
	_not?: GraphQLTypes["GroupMember_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["GroupMember_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	group_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	profile_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "GroupMember" */
["GroupMember_constraint"]: GroupMember_constraint;
	/** input type for inserting data into table "GroupMember" */
["GroupMember_insert_input"]: {
		Group?: GraphQLTypes["Group_obj_rel_insert_input"] | undefined,
	Profile?: GraphQLTypes["Profile_obj_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["GroupMember_max_fields"]: {
	__typename: "GroupMember_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "GroupMember" */
["GroupMember_max_order_by"]: {
		created_at?: GraphQLTypes["order_by"] | undefined,
	group_id?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["GroupMember_min_fields"]: {
	__typename: "GroupMember_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "GroupMember" */
["GroupMember_min_order_by"]: {
		created_at?: GraphQLTypes["order_by"] | undefined,
	group_id?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** response of any mutation on the table "GroupMember" */
["GroupMember_mutation_response"]: {
	__typename: "GroupMember_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["GroupMember"]>
};
	/** on_conflict condition type for table "GroupMember" */
["GroupMember_on_conflict"]: {
		constraint: GraphQLTypes["GroupMember_constraint"],
	update_columns: Array<GraphQLTypes["GroupMember_update_column"]>,
	where?: GraphQLTypes["GroupMember_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "GroupMember". */
["GroupMember_order_by"]: {
		Group?: GraphQLTypes["Group_order_by"] | undefined,
	Profile?: GraphQLTypes["Profile_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	group_id?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: GroupMember */
["GroupMember_pk_columns_input"]: {
		id: string
};
	/** select columns of table "GroupMember" */
["GroupMember_select_column"]: GroupMember_select_column;
	/** input type for updating data in table "GroupMember" */
["GroupMember_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "GroupMember" */
["GroupMember_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["GroupMember_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["GroupMember_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "GroupMember" */
["GroupMember_update_column"]: GroupMember_update_column;
	["GroupMember_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["GroupMember_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["GroupMember_bool_exp"]
};
	/** aggregated selection of "Group" */
["Group_aggregate"]: {
	__typename: "Group_aggregate",
	aggregate?: GraphQLTypes["Group_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Group"]>
};
	/** aggregate fields of "Group" */
["Group_aggregate_fields"]: {
	__typename: "Group_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Group_max_fields"] | undefined,
	min?: GraphQLTypes["Group_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Group". All fields are combined with a logical 'AND'. */
["Group_bool_exp"]: {
		GroupMembers?: GraphQLTypes["GroupMember_bool_exp"] | undefined,
	GroupMembers_aggregate?: GraphQLTypes["GroupMember_aggregate_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Group_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Group_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Group_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	description?: GraphQLTypes["String_comparison_exp"] | undefined,
	email?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	name?: GraphQLTypes["String_comparison_exp"] | undefined,
	phone?: GraphQLTypes["String_comparison_exp"] | undefined,
	picture_url?: GraphQLTypes["String_comparison_exp"] | undefined,
	scheduledExamsByGroupId?: GraphQLTypes["ScheduledExam_bool_exp"] | undefined,
	scheduledExamsByGroupId_aggregate?: GraphQLTypes["ScheduledExam_aggregate_bool_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	website?: GraphQLTypes["String_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Group" */
["Group_constraint"]: Group_constraint;
	/** input type for inserting data into table "Group" */
["Group_insert_input"]: {
		GroupMembers?: GraphQLTypes["GroupMember_arr_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	scheduledExamsByGroupId?: GraphQLTypes["ScheduledExam_arr_rel_insert_input"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate max on columns */
["Group_max_fields"]: {
	__typename: "Group_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate min on columns */
["Group_min_fields"]: {
	__typename: "Group_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** response of any mutation on the table "Group" */
["Group_mutation_response"]: {
	__typename: "Group_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Group"]>
};
	/** input type for inserting object relation for remote table "Group" */
["Group_obj_rel_insert_input"]: {
		data: GraphQLTypes["Group_insert_input"],
	/** upsert condition */
	on_conflict?: GraphQLTypes["Group_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Group" */
["Group_on_conflict"]: {
		constraint: GraphQLTypes["Group_constraint"],
	update_columns: Array<GraphQLTypes["Group_update_column"]>,
	where?: GraphQLTypes["Group_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Group". */
["Group_order_by"]: {
		GroupMembers_aggregate?: GraphQLTypes["GroupMember_aggregate_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	description?: GraphQLTypes["order_by"] | undefined,
	email?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	name?: GraphQLTypes["order_by"] | undefined,
	phone?: GraphQLTypes["order_by"] | undefined,
	picture_url?: GraphQLTypes["order_by"] | undefined,
	scheduledExamsByGroupId_aggregate?: GraphQLTypes["ScheduledExam_aggregate_order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined,
	website?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Group */
["Group_pk_columns_input"]: {
		id: string
};
	/** select columns of table "Group" */
["Group_select_column"]: Group_select_column;
	/** input type for updating data in table "Group" */
["Group_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** Streaming cursor of the table "Group" */
["Group_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Group_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Group_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** update columns of table "Group" */
["Group_update_column"]: Group_update_column;
	["Group_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Group_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Group_bool_exp"]
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
		_eq?: number | undefined,
	_gt?: number | undefined,
	_gte?: number | undefined,
	_in?: Array<number> | undefined,
	_is_null?: boolean | undefined,
	_lt?: number | undefined,
	_lte?: number | undefined,
	_neq?: number | undefined,
	_nin?: Array<number> | undefined
};
	/** columns and relationships of "Organization" */
["Organization"]: {
	__typename: "Organization",
	/** An array relationship */
	OrganizationMembers: Array<GraphQLTypes["OrganizationMember"]>,
	/** An aggregate relationship */
	OrganizationMembers_aggregate: GraphQLTypes["OrganizationMember_aggregate"],
	created_at: GraphQLTypes["timestamp"],
	description?: string | undefined,
	email?: string | undefined,
	id: string,
	name: string,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** columns and relationships of "OrganizationMember" */
["OrganizationMember"]: {
	__typename: "OrganizationMember",
	/** An object relationship */
	Organization: GraphQLTypes["Organization"],
	/** An object relationship */
	Profile: GraphQLTypes["Profile"],
	created_at: GraphQLTypes["timestamp"],
	id: string,
	organization_id: string,
	profile_id: string,
	role: string,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "OrganizationMember" */
["OrganizationMember_aggregate"]: {
	__typename: "OrganizationMember_aggregate",
	aggregate?: GraphQLTypes["OrganizationMember_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["OrganizationMember"]>
};
	["OrganizationMember_aggregate_bool_exp"]: {
		count?: GraphQLTypes["OrganizationMember_aggregate_bool_exp_count"] | undefined
};
	["OrganizationMember_aggregate_bool_exp_count"]: {
		arguments?: Array<GraphQLTypes["OrganizationMember_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["OrganizationMember_bool_exp"] | undefined,
	predicate: GraphQLTypes["Int_comparison_exp"]
};
	/** aggregate fields of "OrganizationMember" */
["OrganizationMember_aggregate_fields"]: {
	__typename: "OrganizationMember_aggregate_fields",
	count: number,
	max?: GraphQLTypes["OrganizationMember_max_fields"] | undefined,
	min?: GraphQLTypes["OrganizationMember_min_fields"] | undefined
};
	/** order by aggregate values of table "OrganizationMember" */
["OrganizationMember_aggregate_order_by"]: {
		count?: GraphQLTypes["order_by"] | undefined,
	max?: GraphQLTypes["OrganizationMember_max_order_by"] | undefined,
	min?: GraphQLTypes["OrganizationMember_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "OrganizationMember" */
["OrganizationMember_arr_rel_insert_input"]: {
		data: Array<GraphQLTypes["OrganizationMember_insert_input"]>,
	/** upsert condition */
	on_conflict?: GraphQLTypes["OrganizationMember_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "OrganizationMember". All fields are combined with a logical 'AND'. */
["OrganizationMember_bool_exp"]: {
		Organization?: GraphQLTypes["Organization_bool_exp"] | undefined,
	Profile?: GraphQLTypes["Profile_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["OrganizationMember_bool_exp"]> | undefined,
	_not?: GraphQLTypes["OrganizationMember_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["OrganizationMember_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	organization_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	profile_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	role?: GraphQLTypes["String_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "OrganizationMember" */
["OrganizationMember_constraint"]: OrganizationMember_constraint;
	/** input type for inserting data into table "OrganizationMember" */
["OrganizationMember_insert_input"]: {
		Organization?: GraphQLTypes["Organization_obj_rel_insert_input"] | undefined,
	Profile?: GraphQLTypes["Profile_obj_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["OrganizationMember_max_fields"]: {
	__typename: "OrganizationMember_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "OrganizationMember" */
["OrganizationMember_max_order_by"]: {
		created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	organization_id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	role?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["OrganizationMember_min_fields"]: {
	__typename: "OrganizationMember_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "OrganizationMember" */
["OrganizationMember_min_order_by"]: {
		created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	organization_id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	role?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** response of any mutation on the table "OrganizationMember" */
["OrganizationMember_mutation_response"]: {
	__typename: "OrganizationMember_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["OrganizationMember"]>
};
	/** on_conflict condition type for table "OrganizationMember" */
["OrganizationMember_on_conflict"]: {
		constraint: GraphQLTypes["OrganizationMember_constraint"],
	update_columns: Array<GraphQLTypes["OrganizationMember_update_column"]>,
	where?: GraphQLTypes["OrganizationMember_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "OrganizationMember". */
["OrganizationMember_order_by"]: {
		Organization?: GraphQLTypes["Organization_order_by"] | undefined,
	Profile?: GraphQLTypes["Profile_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	organization_id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	role?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: OrganizationMember */
["OrganizationMember_pk_columns_input"]: {
		id: string
};
	/** select columns of table "OrganizationMember" */
["OrganizationMember_select_column"]: OrganizationMember_select_column;
	/** input type for updating data in table "OrganizationMember" */
["OrganizationMember_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "OrganizationMember" */
["OrganizationMember_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["OrganizationMember_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["OrganizationMember_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: string | undefined,
	organization_id?: string | undefined,
	profile_id?: string | undefined,
	role?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "OrganizationMember" */
["OrganizationMember_update_column"]: OrganizationMember_update_column;
	["OrganizationMember_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["OrganizationMember_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["OrganizationMember_bool_exp"]
};
	/** aggregated selection of "Organization" */
["Organization_aggregate"]: {
	__typename: "Organization_aggregate",
	aggregate?: GraphQLTypes["Organization_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Organization"]>
};
	/** aggregate fields of "Organization" */
["Organization_aggregate_fields"]: {
	__typename: "Organization_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Organization_max_fields"] | undefined,
	min?: GraphQLTypes["Organization_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Organization". All fields are combined with a logical 'AND'. */
["Organization_bool_exp"]: {
		OrganizationMembers?: GraphQLTypes["OrganizationMember_bool_exp"] | undefined,
	OrganizationMembers_aggregate?: GraphQLTypes["OrganizationMember_aggregate_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Organization_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Organization_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Organization_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	description?: GraphQLTypes["String_comparison_exp"] | undefined,
	email?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	name?: GraphQLTypes["String_comparison_exp"] | undefined,
	phone?: GraphQLTypes["String_comparison_exp"] | undefined,
	picture_url?: GraphQLTypes["String_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	website?: GraphQLTypes["String_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Organization" */
["Organization_constraint"]: Organization_constraint;
	/** input type for inserting data into table "Organization" */
["Organization_insert_input"]: {
		OrganizationMembers?: GraphQLTypes["OrganizationMember_arr_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate max on columns */
["Organization_max_fields"]: {
	__typename: "Organization_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** aggregate min on columns */
["Organization_min_fields"]: {
	__typename: "Organization_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** response of any mutation on the table "Organization" */
["Organization_mutation_response"]: {
	__typename: "Organization_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Organization"]>
};
	/** input type for inserting object relation for remote table "Organization" */
["Organization_obj_rel_insert_input"]: {
		data: GraphQLTypes["Organization_insert_input"],
	/** upsert condition */
	on_conflict?: GraphQLTypes["Organization_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Organization" */
["Organization_on_conflict"]: {
		constraint: GraphQLTypes["Organization_constraint"],
	update_columns: Array<GraphQLTypes["Organization_update_column"]>,
	where?: GraphQLTypes["Organization_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Organization". */
["Organization_order_by"]: {
		OrganizationMembers_aggregate?: GraphQLTypes["OrganizationMember_aggregate_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	description?: GraphQLTypes["order_by"] | undefined,
	email?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	name?: GraphQLTypes["order_by"] | undefined,
	phone?: GraphQLTypes["order_by"] | undefined,
	picture_url?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined,
	website?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Organization */
["Organization_pk_columns_input"]: {
		id: string
};
	/** select columns of table "Organization" */
["Organization_select_column"]: Organization_select_column;
	/** input type for updating data in table "Organization" */
["Organization_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** Streaming cursor of the table "Organization" */
["Organization_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Organization_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Organization_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	description?: string | undefined,
	email?: string | undefined,
	id?: string | undefined,
	name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined,
	website?: string | undefined
};
	/** update columns of table "Organization" */
["Organization_update_column"]: Organization_update_column;
	["Organization_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Organization_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Organization_bool_exp"]
};
	/** columns and relationships of "Profile" */
["Profile"]: {
	__typename: "Profile",
	/** An array relationship */
	GroupMembers: Array<GraphQLTypes["GroupMember"]>,
	/** An aggregate relationship */
	GroupMembers_aggregate: GraphQLTypes["GroupMember_aggregate"],
	/** An array relationship */
	OrganizationMembers: Array<GraphQLTypes["OrganizationMember"]>,
	/** An aggregate relationship */
	OrganizationMembers_aggregate: GraphQLTypes["OrganizationMember_aggregate"],
	/** An array relationship */
	ScheduledExams: Array<GraphQLTypes["ScheduledExam"]>,
	/** An aggregate relationship */
	ScheduledExams_aggregate: GraphQLTypes["ScheduledExam_aggregate"],
	created_at: GraphQLTypes["timestamp"],
	email: string,
	first_name?: string | undefined,
	id: string,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: {
	__typename: "Profile_aggregate",
	aggregate?: GraphQLTypes["Profile_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Profile"]>
};
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: {
	__typename: "Profile_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Profile_max_fields"] | undefined,
	min?: GraphQLTypes["Profile_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
		GroupMembers?: GraphQLTypes["GroupMember_bool_exp"] | undefined,
	GroupMembers_aggregate?: GraphQLTypes["GroupMember_aggregate_bool_exp"] | undefined,
	OrganizationMembers?: GraphQLTypes["OrganizationMember_bool_exp"] | undefined,
	OrganizationMembers_aggregate?: GraphQLTypes["OrganizationMember_aggregate_bool_exp"] | undefined,
	ScheduledExams?: GraphQLTypes["ScheduledExam_bool_exp"] | undefined,
	ScheduledExams_aggregate?: GraphQLTypes["ScheduledExam_aggregate_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Profile_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Profile_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Profile_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	email?: GraphQLTypes["String_comparison_exp"] | undefined,
	first_name?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	last_name?: GraphQLTypes["String_comparison_exp"] | undefined,
	phone?: GraphQLTypes["String_comparison_exp"] | undefined,
	picture_url?: GraphQLTypes["String_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Profile" */
["Profile_constraint"]: Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
		GroupMembers?: GraphQLTypes["GroupMember_arr_rel_insert_input"] | undefined,
	OrganizationMembers?: GraphQLTypes["OrganizationMember_arr_rel_insert_input"] | undefined,
	ScheduledExams?: GraphQLTypes["ScheduledExam_arr_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Profile_max_fields"]: {
	__typename: "Profile_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["Profile_min_fields"]: {
	__typename: "Profile_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: {
	__typename: "Profile_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Profile"]>
};
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
		data: GraphQLTypes["Profile_insert_input"],
	/** upsert condition */
	on_conflict?: GraphQLTypes["Profile_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
		constraint: GraphQLTypes["Profile_constraint"],
	update_columns: Array<GraphQLTypes["Profile_update_column"]>,
	where?: GraphQLTypes["Profile_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
		GroupMembers_aggregate?: GraphQLTypes["GroupMember_aggregate_order_by"] | undefined,
	OrganizationMembers_aggregate?: GraphQLTypes["OrganizationMember_aggregate_order_by"] | undefined,
	ScheduledExams_aggregate?: GraphQLTypes["ScheduledExam_aggregate_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	email?: GraphQLTypes["order_by"] | undefined,
	first_name?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	last_name?: GraphQLTypes["order_by"] | undefined,
	phone?: GraphQLTypes["order_by"] | undefined,
	picture_url?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
		id: string
};
	/** select columns of table "Profile" */
["Profile_select_column"]: Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Profile_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: string | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "Profile" */
["Profile_update_column"]: Profile_update_column;
	["Profile_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Profile_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Profile_bool_exp"]
};
	/** columns and relationships of "Question" */
["Question"]: {
	__typename: "Question",
	/** An object relationship */
	Exam: GraphQLTypes["Exam"],
	boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at: GraphQLTypes["timestamp"],
	exam_id: string,
	expected_answer?: string | undefined,
	id: string,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question: string,
	type: GraphQLTypes["QuestionType"],
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	["QuestionType"]: "scalar" & { name: "QuestionType" };
	/** Boolean expression to compare columns of type "QuestionType". All fields are combined with logical 'AND'. */
["QuestionType_comparison_exp"]: {
		_eq?: GraphQLTypes["QuestionType"] | undefined,
	_gt?: GraphQLTypes["QuestionType"] | undefined,
	_gte?: GraphQLTypes["QuestionType"] | undefined,
	_in?: Array<GraphQLTypes["QuestionType"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["QuestionType"] | undefined,
	_lte?: GraphQLTypes["QuestionType"] | undefined,
	_neq?: GraphQLTypes["QuestionType"] | undefined,
	_nin?: Array<GraphQLTypes["QuestionType"]> | undefined
};
	/** aggregated selection of "Question" */
["Question_aggregate"]: {
	__typename: "Question_aggregate",
	aggregate?: GraphQLTypes["Question_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Question"]>
};
	["Question_aggregate_bool_exp"]: {
		bool_and?: GraphQLTypes["Question_aggregate_bool_exp_bool_and"] | undefined,
	bool_or?: GraphQLTypes["Question_aggregate_bool_exp_bool_or"] | undefined,
	count?: GraphQLTypes["Question_aggregate_bool_exp_count"] | undefined
};
	["Question_aggregate_bool_exp_bool_and"]: {
		arguments: GraphQLTypes["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"],
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["Question_bool_exp"] | undefined,
	predicate: GraphQLTypes["Boolean_comparison_exp"]
};
	["Question_aggregate_bool_exp_bool_or"]: {
		arguments: GraphQLTypes["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"],
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["Question_bool_exp"] | undefined,
	predicate: GraphQLTypes["Boolean_comparison_exp"]
};
	["Question_aggregate_bool_exp_count"]: {
		arguments?: Array<GraphQLTypes["Question_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["Question_bool_exp"] | undefined,
	predicate: GraphQLTypes["Int_comparison_exp"]
};
	/** aggregate fields of "Question" */
["Question_aggregate_fields"]: {
	__typename: "Question_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Question_max_fields"] | undefined,
	min?: GraphQLTypes["Question_min_fields"] | undefined
};
	/** order by aggregate values of table "Question" */
["Question_aggregate_order_by"]: {
		count?: GraphQLTypes["order_by"] | undefined,
	max?: GraphQLTypes["Question_max_order_by"] | undefined,
	min?: GraphQLTypes["Question_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "Question" */
["Question_arr_rel_insert_input"]: {
		data: Array<GraphQLTypes["Question_insert_input"]>,
	/** upsert condition */
	on_conflict?: GraphQLTypes["Question_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "Question". All fields are combined with a logical 'AND'. */
["Question_bool_exp"]: {
		Exam?: GraphQLTypes["Exam_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Question_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Question_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Question_bool_exp"]> | undefined,
	boolean_expected_answer?: GraphQLTypes["Boolean_comparison_exp"] | undefined,
	correct_options?: GraphQLTypes["Boolean_array_comparison_exp"] | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	exam_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	expected_answer?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	image_url?: GraphQLTypes["String_comparison_exp"] | undefined,
	options?: GraphQLTypes["String_array_comparison_exp"] | undefined,
	question?: GraphQLTypes["String_comparison_exp"] | undefined,
	type?: GraphQLTypes["QuestionType_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Question" */
["Question_constraint"]: Question_constraint;
	/** input type for inserting data into table "Question" */
["Question_insert_input"]: {
		Exam?: GraphQLTypes["Exam_obj_rel_insert_input"] | undefined,
	boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: GraphQLTypes["QuestionType"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Question_max_fields"]: {
	__typename: "Question_max_fields",
	correct_options?: Array<boolean> | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: GraphQLTypes["QuestionType"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "Question" */
["Question_max_order_by"]: {
		correct_options?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	exam_id?: GraphQLTypes["order_by"] | undefined,
	expected_answer?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	image_url?: GraphQLTypes["order_by"] | undefined,
	options?: GraphQLTypes["order_by"] | undefined,
	question?: GraphQLTypes["order_by"] | undefined,
	type?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["Question_min_fields"]: {
	__typename: "Question_min_fields",
	correct_options?: Array<boolean> | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: GraphQLTypes["QuestionType"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "Question" */
["Question_min_order_by"]: {
		correct_options?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	exam_id?: GraphQLTypes["order_by"] | undefined,
	expected_answer?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	image_url?: GraphQLTypes["order_by"] | undefined,
	options?: GraphQLTypes["order_by"] | undefined,
	question?: GraphQLTypes["order_by"] | undefined,
	type?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** response of any mutation on the table "Question" */
["Question_mutation_response"]: {
	__typename: "Question_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Question"]>
};
	/** on_conflict condition type for table "Question" */
["Question_on_conflict"]: {
		constraint: GraphQLTypes["Question_constraint"],
	update_columns: Array<GraphQLTypes["Question_update_column"]>,
	where?: GraphQLTypes["Question_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Question". */
["Question_order_by"]: {
		Exam?: GraphQLTypes["Exam_order_by"] | undefined,
	boolean_expected_answer?: GraphQLTypes["order_by"] | undefined,
	correct_options?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	exam_id?: GraphQLTypes["order_by"] | undefined,
	expected_answer?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	image_url?: GraphQLTypes["order_by"] | undefined,
	options?: GraphQLTypes["order_by"] | undefined,
	question?: GraphQLTypes["order_by"] | undefined,
	type?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Question */
["Question_pk_columns_input"]: {
		id: string
};
	/** select columns of table "Question" */
["Question_select_column"]: Question_select_column;
	/** select "Question_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Question" */
["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"]: Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns;
	/** select "Question_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Question" */
["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"]: Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns;
	/** input type for updating data in table "Question" */
["Question_set_input"]: {
		boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: GraphQLTypes["QuestionType"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Question" */
["Question_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Question_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Question_stream_cursor_value_input"]: {
		boolean_expected_answer?: boolean | undefined,
	correct_options?: Array<boolean> | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	expected_answer?: string | undefined,
	id?: string | undefined,
	image_url?: string | undefined,
	options?: Array<string> | undefined,
	question?: string | undefined,
	type?: GraphQLTypes["QuestionType"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "Question" */
["Question_update_column"]: Question_update_column;
	["Question_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Question_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Question_bool_exp"]
};
	/** columns and relationships of "ScheduledExam" */
["ScheduledExam"]: {
	__typename: "ScheduledExam",
	/** An object relationship */
	Profile?: GraphQLTypes["Profile"] | undefined,
	created_at: GraphQLTypes["timestamp"],
	end_time: GraphQLTypes["timestamp"],
	/** An object relationship */
	examByExamId: GraphQLTypes["Exam"],
	exam_id: string,
	/** An object relationship */
	groupByGroupId?: GraphQLTypes["Group"] | undefined,
	group_id?: string | undefined,
	id: string,
	profile_id?: string | undefined,
	start_time: GraphQLTypes["timestamp"],
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "ScheduledExam" */
["ScheduledExam_aggregate"]: {
	__typename: "ScheduledExam_aggregate",
	aggregate?: GraphQLTypes["ScheduledExam_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["ScheduledExam"]>
};
	["ScheduledExam_aggregate_bool_exp"]: {
		count?: GraphQLTypes["ScheduledExam_aggregate_bool_exp_count"] | undefined
};
	["ScheduledExam_aggregate_bool_exp_count"]: {
		arguments?: Array<GraphQLTypes["ScheduledExam_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["ScheduledExam_bool_exp"] | undefined,
	predicate: GraphQLTypes["Int_comparison_exp"]
};
	/** aggregate fields of "ScheduledExam" */
["ScheduledExam_aggregate_fields"]: {
	__typename: "ScheduledExam_aggregate_fields",
	count: number,
	max?: GraphQLTypes["ScheduledExam_max_fields"] | undefined,
	min?: GraphQLTypes["ScheduledExam_min_fields"] | undefined
};
	/** order by aggregate values of table "ScheduledExam" */
["ScheduledExam_aggregate_order_by"]: {
		count?: GraphQLTypes["order_by"] | undefined,
	max?: GraphQLTypes["ScheduledExam_max_order_by"] | undefined,
	min?: GraphQLTypes["ScheduledExam_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "ScheduledExam" */
["ScheduledExam_arr_rel_insert_input"]: {
		data: Array<GraphQLTypes["ScheduledExam_insert_input"]>,
	/** upsert condition */
	on_conflict?: GraphQLTypes["ScheduledExam_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "ScheduledExam". All fields are combined with a logical 'AND'. */
["ScheduledExam_bool_exp"]: {
		Profile?: GraphQLTypes["Profile_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["ScheduledExam_bool_exp"]> | undefined,
	_not?: GraphQLTypes["ScheduledExam_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["ScheduledExam_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	end_time?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	examByExamId?: GraphQLTypes["Exam_bool_exp"] | undefined,
	exam_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	groupByGroupId?: GraphQLTypes["Group_bool_exp"] | undefined,
	group_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	profile_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	start_time?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "ScheduledExam" */
["ScheduledExam_constraint"]: ScheduledExam_constraint;
	/** input type for inserting data into table "ScheduledExam" */
["ScheduledExam_insert_input"]: {
		Profile?: GraphQLTypes["Profile_obj_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	end_time?: GraphQLTypes["timestamp"] | undefined,
	examByExamId?: GraphQLTypes["Exam_obj_rel_insert_input"] | undefined,
	exam_id?: string | undefined,
	groupByGroupId?: GraphQLTypes["Group_obj_rel_insert_input"] | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: GraphQLTypes["timestamp"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["ScheduledExam_max_fields"]: {
	__typename: "ScheduledExam_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	end_time?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: GraphQLTypes["timestamp"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "ScheduledExam" */
["ScheduledExam_max_order_by"]: {
		created_at?: GraphQLTypes["order_by"] | undefined,
	end_time?: GraphQLTypes["order_by"] | undefined,
	exam_id?: GraphQLTypes["order_by"] | undefined,
	group_id?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	start_time?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["ScheduledExam_min_fields"]: {
	__typename: "ScheduledExam_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	end_time?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: GraphQLTypes["timestamp"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "ScheduledExam" */
["ScheduledExam_min_order_by"]: {
		created_at?: GraphQLTypes["order_by"] | undefined,
	end_time?: GraphQLTypes["order_by"] | undefined,
	exam_id?: GraphQLTypes["order_by"] | undefined,
	group_id?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	start_time?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** response of any mutation on the table "ScheduledExam" */
["ScheduledExam_mutation_response"]: {
	__typename: "ScheduledExam_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["ScheduledExam"]>
};
	/** on_conflict condition type for table "ScheduledExam" */
["ScheduledExam_on_conflict"]: {
		constraint: GraphQLTypes["ScheduledExam_constraint"],
	update_columns: Array<GraphQLTypes["ScheduledExam_update_column"]>,
	where?: GraphQLTypes["ScheduledExam_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "ScheduledExam". */
["ScheduledExam_order_by"]: {
		Profile?: GraphQLTypes["Profile_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	end_time?: GraphQLTypes["order_by"] | undefined,
	examByExamId?: GraphQLTypes["Exam_order_by"] | undefined,
	exam_id?: GraphQLTypes["order_by"] | undefined,
	groupByGroupId?: GraphQLTypes["Group_order_by"] | undefined,
	group_id?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	start_time?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: ScheduledExam */
["ScheduledExam_pk_columns_input"]: {
		id: string
};
	/** select columns of table "ScheduledExam" */
["ScheduledExam_select_column"]: ScheduledExam_select_column;
	/** input type for updating data in table "ScheduledExam" */
["ScheduledExam_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	end_time?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: GraphQLTypes["timestamp"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "ScheduledExam" */
["ScheduledExam_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["ScheduledExam_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["ScheduledExam_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	end_time?: GraphQLTypes["timestamp"] | undefined,
	exam_id?: string | undefined,
	group_id?: string | undefined,
	id?: string | undefined,
	profile_id?: string | undefined,
	start_time?: GraphQLTypes["timestamp"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "ScheduledExam" */
["ScheduledExam_update_column"]: ScheduledExam_update_column;
	["ScheduledExam_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["ScheduledExam_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["ScheduledExam_bool_exp"]
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_array_comparison_exp"]: {
		/** is the array contained in the given array value */
	_contained_in?: Array<string> | undefined,
	/** does the array contain the given value */
	_contains?: Array<string> | undefined,
	_eq?: Array<string> | undefined,
	_gt?: Array<string> | undefined,
	_gte?: Array<string> | undefined,
	_in?: Array<Array<string> | undefined>,
	_is_null?: boolean | undefined,
	_lt?: Array<string> | undefined,
	_lte?: Array<string> | undefined,
	_neq?: Array<string> | undefined,
	_nin?: Array<Array<string> | undefined>
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
		_eq?: string | undefined,
	_gt?: string | undefined,
	_gte?: string | undefined,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined,
	_in?: Array<string> | undefined,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined,
	_is_null?: boolean | undefined,
	/** does the column match the given pattern */
	_like?: string | undefined,
	_lt?: string | undefined,
	_lte?: string | undefined,
	_neq?: string | undefined,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined,
	_nin?: Array<string> | undefined,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: {
	__typename: "_prisma_migrations",
	applied_steps_count: number,
	checksum: string,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id: string,
	logs?: string | undefined,
	migration_name: string,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at: GraphQLTypes["timestamptz"]
};
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: {
	__typename: "_prisma_migrations_aggregate",
	aggregate?: GraphQLTypes["_prisma_migrations_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["_prisma_migrations"]>
};
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: {
	__typename: "_prisma_migrations_aggregate_fields",
	avg?: GraphQLTypes["_prisma_migrations_avg_fields"] | undefined,
	count: number,
	max?: GraphQLTypes["_prisma_migrations_max_fields"] | undefined,
	min?: GraphQLTypes["_prisma_migrations_min_fields"] | undefined,
	stddev?: GraphQLTypes["_prisma_migrations_stddev_fields"] | undefined,
	stddev_pop?: GraphQLTypes["_prisma_migrations_stddev_pop_fields"] | undefined,
	stddev_samp?: GraphQLTypes["_prisma_migrations_stddev_samp_fields"] | undefined,
	sum?: GraphQLTypes["_prisma_migrations_sum_fields"] | undefined,
	var_pop?: GraphQLTypes["_prisma_migrations_var_pop_fields"] | undefined,
	var_samp?: GraphQLTypes["_prisma_migrations_var_samp_fields"] | undefined,
	variance?: GraphQLTypes["_prisma_migrations_variance_fields"] | undefined
};
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: {
	__typename: "_prisma_migrations_avg_fields",
	applied_steps_count?: number | undefined
};
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
		_and?: Array<GraphQLTypes["_prisma_migrations_bool_exp"]> | undefined,
	_not?: GraphQLTypes["_prisma_migrations_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["_prisma_migrations_bool_exp"]> | undefined,
	applied_steps_count?: GraphQLTypes["Int_comparison_exp"] | undefined,
	checksum?: GraphQLTypes["String_comparison_exp"] | undefined,
	finished_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	logs?: GraphQLTypes["String_comparison_exp"] | undefined,
	migration_name?: GraphQLTypes["String_comparison_exp"] | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined,
	started_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "_prisma_migrations" */
["_prisma_migrations_constraint"]: _prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
		applied_steps_count?: number | undefined
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: {
	__typename: "_prisma_migrations_max_fields",
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: {
	__typename: "_prisma_migrations_min_fields",
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: {
	__typename: "_prisma_migrations_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["_prisma_migrations"]>
};
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
		constraint: GraphQLTypes["_prisma_migrations_constraint"],
	update_columns: Array<GraphQLTypes["_prisma_migrations_update_column"]>,
	where?: GraphQLTypes["_prisma_migrations_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
		applied_steps_count?: GraphQLTypes["order_by"] | undefined,
	checksum?: GraphQLTypes["order_by"] | undefined,
	finished_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	logs?: GraphQLTypes["order_by"] | undefined,
	migration_name?: GraphQLTypes["order_by"] | undefined,
	rolled_back_at?: GraphQLTypes["order_by"] | undefined,
	started_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
		id: string
};
	/** select columns of table "_prisma_migrations" */
["_prisma_migrations_select_column"]: _prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: {
	__typename: "_prisma_migrations_stddev_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: {
	__typename: "_prisma_migrations_stddev_pop_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: {
	__typename: "_prisma_migrations_stddev_samp_fields",
	applied_steps_count?: number | undefined
};
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["_prisma_migrations_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: {
	__typename: "_prisma_migrations_sum_fields",
	applied_steps_count?: number | undefined
};
	/** update columns of table "_prisma_migrations" */
["_prisma_migrations_update_column"]: _prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
		/** increments the numeric columns with given value of the filtered values */
	_inc?: GraphQLTypes["_prisma_migrations_inc_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["_prisma_migrations_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["_prisma_migrations_bool_exp"]
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: {
	__typename: "_prisma_migrations_var_pop_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: {
	__typename: "_prisma_migrations_var_samp_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: {
	__typename: "_prisma_migrations_variance_fields",
	applied_steps_count?: number | undefined
};
	/** ordering argument of a cursor */
["cursor_ordering"]: cursor_ordering;
	/** mutation root */
["mutation_root"]: {
	__typename: "mutation_root",
	/** delete data from the table: "Exam" */
	delete_Exam?: GraphQLTypes["Exam_mutation_response"] | undefined,
	/** delete single row from the table: "Exam" */
	delete_Exam_by_pk?: GraphQLTypes["Exam"] | undefined,
	/** delete data from the table: "Group" */
	delete_Group?: GraphQLTypes["Group_mutation_response"] | undefined,
	/** delete data from the table: "GroupMember" */
	delete_GroupMember?: GraphQLTypes["GroupMember_mutation_response"] | undefined,
	/** delete single row from the table: "GroupMember" */
	delete_GroupMember_by_pk?: GraphQLTypes["GroupMember"] | undefined,
	/** delete single row from the table: "Group" */
	delete_Group_by_pk?: GraphQLTypes["Group"] | undefined,
	/** delete data from the table: "Organization" */
	delete_Organization?: GraphQLTypes["Organization_mutation_response"] | undefined,
	/** delete data from the table: "OrganizationMember" */
	delete_OrganizationMember?: GraphQLTypes["OrganizationMember_mutation_response"] | undefined,
	/** delete single row from the table: "OrganizationMember" */
	delete_OrganizationMember_by_pk?: GraphQLTypes["OrganizationMember"] | undefined,
	/** delete single row from the table: "Organization" */
	delete_Organization_by_pk?: GraphQLTypes["Organization"] | undefined,
	/** delete data from the table: "Profile" */
	delete_Profile?: GraphQLTypes["Profile_mutation_response"] | undefined,
	/** delete single row from the table: "Profile" */
	delete_Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** delete data from the table: "Question" */
	delete_Question?: GraphQLTypes["Question_mutation_response"] | undefined,
	/** delete single row from the table: "Question" */
	delete_Question_by_pk?: GraphQLTypes["Question"] | undefined,
	/** delete data from the table: "ScheduledExam" */
	delete_ScheduledExam?: GraphQLTypes["ScheduledExam_mutation_response"] | undefined,
	/** delete single row from the table: "ScheduledExam" */
	delete_ScheduledExam_by_pk?: GraphQLTypes["ScheduledExam"] | undefined,
	/** delete data from the table: "_prisma_migrations" */
	delete__prisma_migrations?: GraphQLTypes["_prisma_migrations_mutation_response"] | undefined,
	/** delete single row from the table: "_prisma_migrations" */
	delete__prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** insert data into the table: "Exam" */
	insert_Exam?: GraphQLTypes["Exam_mutation_response"] | undefined,
	/** insert a single row into the table: "Exam" */
	insert_Exam_one?: GraphQLTypes["Exam"] | undefined,
	/** insert data into the table: "Group" */
	insert_Group?: GraphQLTypes["Group_mutation_response"] | undefined,
	/** insert data into the table: "GroupMember" */
	insert_GroupMember?: GraphQLTypes["GroupMember_mutation_response"] | undefined,
	/** insert a single row into the table: "GroupMember" */
	insert_GroupMember_one?: GraphQLTypes["GroupMember"] | undefined,
	/** insert a single row into the table: "Group" */
	insert_Group_one?: GraphQLTypes["Group"] | undefined,
	/** insert data into the table: "Organization" */
	insert_Organization?: GraphQLTypes["Organization_mutation_response"] | undefined,
	/** insert data into the table: "OrganizationMember" */
	insert_OrganizationMember?: GraphQLTypes["OrganizationMember_mutation_response"] | undefined,
	/** insert a single row into the table: "OrganizationMember" */
	insert_OrganizationMember_one?: GraphQLTypes["OrganizationMember"] | undefined,
	/** insert a single row into the table: "Organization" */
	insert_Organization_one?: GraphQLTypes["Organization"] | undefined,
	/** insert data into the table: "Profile" */
	insert_Profile?: GraphQLTypes["Profile_mutation_response"] | undefined,
	/** insert a single row into the table: "Profile" */
	insert_Profile_one?: GraphQLTypes["Profile"] | undefined,
	/** insert data into the table: "Question" */
	insert_Question?: GraphQLTypes["Question_mutation_response"] | undefined,
	/** insert a single row into the table: "Question" */
	insert_Question_one?: GraphQLTypes["Question"] | undefined,
	/** insert data into the table: "ScheduledExam" */
	insert_ScheduledExam?: GraphQLTypes["ScheduledExam_mutation_response"] | undefined,
	/** insert a single row into the table: "ScheduledExam" */
	insert_ScheduledExam_one?: GraphQLTypes["ScheduledExam"] | undefined,
	/** insert data into the table: "_prisma_migrations" */
	insert__prisma_migrations?: GraphQLTypes["_prisma_migrations_mutation_response"] | undefined,
	/** insert a single row into the table: "_prisma_migrations" */
	insert__prisma_migrations_one?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** update data of the table: "Exam" */
	update_Exam?: GraphQLTypes["Exam_mutation_response"] | undefined,
	/** update single row of the table: "Exam" */
	update_Exam_by_pk?: GraphQLTypes["Exam"] | undefined,
	/** update multiples rows of table: "Exam" */
	update_Exam_many?: Array<GraphQLTypes["Exam_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Group" */
	update_Group?: GraphQLTypes["Group_mutation_response"] | undefined,
	/** update data of the table: "GroupMember" */
	update_GroupMember?: GraphQLTypes["GroupMember_mutation_response"] | undefined,
	/** update single row of the table: "GroupMember" */
	update_GroupMember_by_pk?: GraphQLTypes["GroupMember"] | undefined,
	/** update multiples rows of table: "GroupMember" */
	update_GroupMember_many?: Array<GraphQLTypes["GroupMember_mutation_response"] | undefined> | undefined,
	/** update single row of the table: "Group" */
	update_Group_by_pk?: GraphQLTypes["Group"] | undefined,
	/** update multiples rows of table: "Group" */
	update_Group_many?: Array<GraphQLTypes["Group_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Organization" */
	update_Organization?: GraphQLTypes["Organization_mutation_response"] | undefined,
	/** update data of the table: "OrganizationMember" */
	update_OrganizationMember?: GraphQLTypes["OrganizationMember_mutation_response"] | undefined,
	/** update single row of the table: "OrganizationMember" */
	update_OrganizationMember_by_pk?: GraphQLTypes["OrganizationMember"] | undefined,
	/** update multiples rows of table: "OrganizationMember" */
	update_OrganizationMember_many?: Array<GraphQLTypes["OrganizationMember_mutation_response"] | undefined> | undefined,
	/** update single row of the table: "Organization" */
	update_Organization_by_pk?: GraphQLTypes["Organization"] | undefined,
	/** update multiples rows of table: "Organization" */
	update_Organization_many?: Array<GraphQLTypes["Organization_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Profile" */
	update_Profile?: GraphQLTypes["Profile_mutation_response"] | undefined,
	/** update single row of the table: "Profile" */
	update_Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** update multiples rows of table: "Profile" */
	update_Profile_many?: Array<GraphQLTypes["Profile_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Question" */
	update_Question?: GraphQLTypes["Question_mutation_response"] | undefined,
	/** update single row of the table: "Question" */
	update_Question_by_pk?: GraphQLTypes["Question"] | undefined,
	/** update multiples rows of table: "Question" */
	update_Question_many?: Array<GraphQLTypes["Question_mutation_response"] | undefined> | undefined,
	/** update data of the table: "ScheduledExam" */
	update_ScheduledExam?: GraphQLTypes["ScheduledExam_mutation_response"] | undefined,
	/** update single row of the table: "ScheduledExam" */
	update_ScheduledExam_by_pk?: GraphQLTypes["ScheduledExam"] | undefined,
	/** update multiples rows of table: "ScheduledExam" */
	update_ScheduledExam_many?: Array<GraphQLTypes["ScheduledExam_mutation_response"] | undefined> | undefined,
	/** update data of the table: "_prisma_migrations" */
	update__prisma_migrations?: GraphQLTypes["_prisma_migrations_mutation_response"] | undefined,
	/** update single row of the table: "_prisma_migrations" */
	update__prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** update multiples rows of table: "_prisma_migrations" */
	update__prisma_migrations_many?: Array<GraphQLTypes["_prisma_migrations_mutation_response"] | undefined> | undefined
};
	/** column ordering options */
["order_by"]: order_by;
	["query_root"]: {
	__typename: "query_root",
	/** fetch data from the table: "Exam" */
	Exam: Array<GraphQLTypes["Exam"]>,
	/** fetch aggregated fields from the table: "Exam" */
	Exam_aggregate: GraphQLTypes["Exam_aggregate"],
	/** fetch data from the table: "Exam" using primary key columns */
	Exam_by_pk?: GraphQLTypes["Exam"] | undefined,
	/** fetch data from the table: "Group" */
	Group: Array<GraphQLTypes["Group"]>,
	/** fetch data from the table: "GroupMember" */
	GroupMember: Array<GraphQLTypes["GroupMember"]>,
	/** fetch aggregated fields from the table: "GroupMember" */
	GroupMember_aggregate: GraphQLTypes["GroupMember_aggregate"],
	/** fetch data from the table: "GroupMember" using primary key columns */
	GroupMember_by_pk?: GraphQLTypes["GroupMember"] | undefined,
	/** fetch aggregated fields from the table: "Group" */
	Group_aggregate: GraphQLTypes["Group_aggregate"],
	/** fetch data from the table: "Group" using primary key columns */
	Group_by_pk?: GraphQLTypes["Group"] | undefined,
	/** fetch data from the table: "Organization" */
	Organization: Array<GraphQLTypes["Organization"]>,
	/** fetch data from the table: "OrganizationMember" */
	OrganizationMember: Array<GraphQLTypes["OrganizationMember"]>,
	/** fetch aggregated fields from the table: "OrganizationMember" */
	OrganizationMember_aggregate: GraphQLTypes["OrganizationMember_aggregate"],
	/** fetch data from the table: "OrganizationMember" using primary key columns */
	OrganizationMember_by_pk?: GraphQLTypes["OrganizationMember"] | undefined,
	/** fetch aggregated fields from the table: "Organization" */
	Organization_aggregate: GraphQLTypes["Organization_aggregate"],
	/** fetch data from the table: "Organization" using primary key columns */
	Organization_by_pk?: GraphQLTypes["Organization"] | undefined,
	/** fetch data from the table: "Profile" */
	Profile: Array<GraphQLTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: GraphQLTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** fetch data from the table: "Question" */
	Question: Array<GraphQLTypes["Question"]>,
	/** fetch aggregated fields from the table: "Question" */
	Question_aggregate: GraphQLTypes["Question_aggregate"],
	/** fetch data from the table: "Question" using primary key columns */
	Question_by_pk?: GraphQLTypes["Question"] | undefined,
	/** fetch data from the table: "ScheduledExam" */
	ScheduledExam: Array<GraphQLTypes["ScheduledExam"]>,
	/** fetch aggregated fields from the table: "ScheduledExam" */
	ScheduledExam_aggregate: GraphQLTypes["ScheduledExam_aggregate"],
	/** fetch data from the table: "ScheduledExam" using primary key columns */
	ScheduledExam_by_pk?: GraphQLTypes["ScheduledExam"] | undefined,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<GraphQLTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: GraphQLTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined
};
	["subscription_root"]: {
	__typename: "subscription_root",
	/** fetch data from the table: "Exam" */
	Exam: Array<GraphQLTypes["Exam"]>,
	/** fetch aggregated fields from the table: "Exam" */
	Exam_aggregate: GraphQLTypes["Exam_aggregate"],
	/** fetch data from the table: "Exam" using primary key columns */
	Exam_by_pk?: GraphQLTypes["Exam"] | undefined,
	/** fetch data from the table in a streaming manner: "Exam" */
	Exam_stream: Array<GraphQLTypes["Exam"]>,
	/** fetch data from the table: "Group" */
	Group: Array<GraphQLTypes["Group"]>,
	/** fetch data from the table: "GroupMember" */
	GroupMember: Array<GraphQLTypes["GroupMember"]>,
	/** fetch aggregated fields from the table: "GroupMember" */
	GroupMember_aggregate: GraphQLTypes["GroupMember_aggregate"],
	/** fetch data from the table: "GroupMember" using primary key columns */
	GroupMember_by_pk?: GraphQLTypes["GroupMember"] | undefined,
	/** fetch data from the table in a streaming manner: "GroupMember" */
	GroupMember_stream: Array<GraphQLTypes["GroupMember"]>,
	/** fetch aggregated fields from the table: "Group" */
	Group_aggregate: GraphQLTypes["Group_aggregate"],
	/** fetch data from the table: "Group" using primary key columns */
	Group_by_pk?: GraphQLTypes["Group"] | undefined,
	/** fetch data from the table in a streaming manner: "Group" */
	Group_stream: Array<GraphQLTypes["Group"]>,
	/** fetch data from the table: "Organization" */
	Organization: Array<GraphQLTypes["Organization"]>,
	/** fetch data from the table: "OrganizationMember" */
	OrganizationMember: Array<GraphQLTypes["OrganizationMember"]>,
	/** fetch aggregated fields from the table: "OrganizationMember" */
	OrganizationMember_aggregate: GraphQLTypes["OrganizationMember_aggregate"],
	/** fetch data from the table: "OrganizationMember" using primary key columns */
	OrganizationMember_by_pk?: GraphQLTypes["OrganizationMember"] | undefined,
	/** fetch data from the table in a streaming manner: "OrganizationMember" */
	OrganizationMember_stream: Array<GraphQLTypes["OrganizationMember"]>,
	/** fetch aggregated fields from the table: "Organization" */
	Organization_aggregate: GraphQLTypes["Organization_aggregate"],
	/** fetch data from the table: "Organization" using primary key columns */
	Organization_by_pk?: GraphQLTypes["Organization"] | undefined,
	/** fetch data from the table in a streaming manner: "Organization" */
	Organization_stream: Array<GraphQLTypes["Organization"]>,
	/** fetch data from the table: "Profile" */
	Profile: Array<GraphQLTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: GraphQLTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** fetch data from the table in a streaming manner: "Profile" */
	Profile_stream: Array<GraphQLTypes["Profile"]>,
	/** fetch data from the table: "Question" */
	Question: Array<GraphQLTypes["Question"]>,
	/** fetch aggregated fields from the table: "Question" */
	Question_aggregate: GraphQLTypes["Question_aggregate"],
	/** fetch data from the table: "Question" using primary key columns */
	Question_by_pk?: GraphQLTypes["Question"] | undefined,
	/** fetch data from the table in a streaming manner: "Question" */
	Question_stream: Array<GraphQLTypes["Question"]>,
	/** fetch data from the table: "ScheduledExam" */
	ScheduledExam: Array<GraphQLTypes["ScheduledExam"]>,
	/** fetch aggregated fields from the table: "ScheduledExam" */
	ScheduledExam_aggregate: GraphQLTypes["ScheduledExam_aggregate"],
	/** fetch data from the table: "ScheduledExam" using primary key columns */
	ScheduledExam_by_pk?: GraphQLTypes["ScheduledExam"] | undefined,
	/** fetch data from the table in a streaming manner: "ScheduledExam" */
	ScheduledExam_stream: Array<GraphQLTypes["ScheduledExam"]>,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<GraphQLTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: GraphQLTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** fetch data from the table in a streaming manner: "_prisma_migrations" */
	_prisma_migrations_stream: Array<GraphQLTypes["_prisma_migrations"]>
};
	["timestamp"]: "scalar" & { name: "timestamp" };
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
		_eq?: GraphQLTypes["timestamp"] | undefined,
	_gt?: GraphQLTypes["timestamp"] | undefined,
	_gte?: GraphQLTypes["timestamp"] | undefined,
	_in?: Array<GraphQLTypes["timestamp"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["timestamp"] | undefined,
	_lte?: GraphQLTypes["timestamp"] | undefined,
	_neq?: GraphQLTypes["timestamp"] | undefined,
	_nin?: Array<GraphQLTypes["timestamp"]> | undefined
};
	["timestamptz"]: "scalar" & { name: "timestamptz" };
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
		_eq?: GraphQLTypes["timestamptz"] | undefined,
	_gt?: GraphQLTypes["timestamptz"] | undefined,
	_gte?: GraphQLTypes["timestamptz"] | undefined,
	_in?: Array<GraphQLTypes["timestamptz"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["timestamptz"] | undefined,
	_lte?: GraphQLTypes["timestamptz"] | undefined,
	_neq?: GraphQLTypes["timestamptz"] | undefined,
	_nin?: Array<GraphQLTypes["timestamptz"]> | undefined
}
    }
/** unique or primary key constraints on table "Exam" */
export const enum Exam_constraint {
	Exam_pkey = "Exam_pkey"
}
/** select columns of table "Exam" */
export const enum Exam_select_column {
	created_at = "created_at",
	description = "description",
	id = "id",
	name = "name",
	updated_at = "updated_at"
}
/** update columns of table "Exam" */
export const enum Exam_update_column {
	created_at = "created_at",
	description = "description",
	id = "id",
	name = "name",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "GroupMember" */
export const enum GroupMember_constraint {
	GroupMember_pkey = "GroupMember_pkey"
}
/** select columns of table "GroupMember" */
export const enum GroupMember_select_column {
	created_at = "created_at",
	group_id = "group_id",
	id = "id",
	profile_id = "profile_id",
	updated_at = "updated_at"
}
/** update columns of table "GroupMember" */
export const enum GroupMember_update_column {
	created_at = "created_at",
	group_id = "group_id",
	id = "id",
	profile_id = "profile_id",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "Group" */
export const enum Group_constraint {
	Group_pkey = "Group_pkey"
}
/** select columns of table "Group" */
export const enum Group_select_column {
	created_at = "created_at",
	description = "description",
	email = "email",
	id = "id",
	name = "name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at",
	website = "website"
}
/** update columns of table "Group" */
export const enum Group_update_column {
	created_at = "created_at",
	description = "description",
	email = "email",
	id = "id",
	name = "name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at",
	website = "website"
}
/** unique or primary key constraints on table "OrganizationMember" */
export const enum OrganizationMember_constraint {
	OrganizationMember_pkey = "OrganizationMember_pkey"
}
/** select columns of table "OrganizationMember" */
export const enum OrganizationMember_select_column {
	created_at = "created_at",
	id = "id",
	organization_id = "organization_id",
	profile_id = "profile_id",
	role = "role",
	updated_at = "updated_at"
}
/** update columns of table "OrganizationMember" */
export const enum OrganizationMember_update_column {
	created_at = "created_at",
	id = "id",
	organization_id = "organization_id",
	profile_id = "profile_id",
	role = "role",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "Organization" */
export const enum Organization_constraint {
	Organization_pkey = "Organization_pkey"
}
/** select columns of table "Organization" */
export const enum Organization_select_column {
	created_at = "created_at",
	description = "description",
	email = "email",
	id = "id",
	name = "name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at",
	website = "website"
}
/** update columns of table "Organization" */
export const enum Organization_update_column {
	created_at = "created_at",
	description = "description",
	email = "email",
	id = "id",
	name = "name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at",
	website = "website"
}
/** unique or primary key constraints on table "Profile" */
export const enum Profile_constraint {
	Profile_email_key = "Profile_email_key",
	Profile_pkey = "Profile_pkey"
}
/** select columns of table "Profile" */
export const enum Profile_select_column {
	created_at = "created_at",
	email = "email",
	first_name = "first_name",
	id = "id",
	last_name = "last_name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at"
}
/** update columns of table "Profile" */
export const enum Profile_update_column {
	created_at = "created_at",
	email = "email",
	first_name = "first_name",
	id = "id",
	last_name = "last_name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "Question" */
export const enum Question_constraint {
	Question_pkey = "Question_pkey"
}
/** select columns of table "Question" */
export const enum Question_select_column {
	boolean_expected_answer = "boolean_expected_answer",
	correct_options = "correct_options",
	created_at = "created_at",
	exam_id = "exam_id",
	expected_answer = "expected_answer",
	id = "id",
	image_url = "image_url",
	options = "options",
	question = "question",
	type = "type",
	updated_at = "updated_at"
}
/** select "Question_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Question" */
export const enum Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns {
	boolean_expected_answer = "boolean_expected_answer"
}
/** select "Question_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Question" */
export const enum Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns {
	boolean_expected_answer = "boolean_expected_answer"
}
/** update columns of table "Question" */
export const enum Question_update_column {
	boolean_expected_answer = "boolean_expected_answer",
	correct_options = "correct_options",
	created_at = "created_at",
	exam_id = "exam_id",
	expected_answer = "expected_answer",
	id = "id",
	image_url = "image_url",
	options = "options",
	question = "question",
	type = "type",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "ScheduledExam" */
export const enum ScheduledExam_constraint {
	ScheduledExam_pkey = "ScheduledExam_pkey"
}
/** select columns of table "ScheduledExam" */
export const enum ScheduledExam_select_column {
	created_at = "created_at",
	end_time = "end_time",
	exam_id = "exam_id",
	group_id = "group_id",
	id = "id",
	profile_id = "profile_id",
	start_time = "start_time",
	updated_at = "updated_at"
}
/** update columns of table "ScheduledExam" */
export const enum ScheduledExam_update_column {
	created_at = "created_at",
	end_time = "end_time",
	exam_id = "exam_id",
	group_id = "group_id",
	id = "id",
	profile_id = "profile_id",
	start_time = "start_time",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "_prisma_migrations" */
export const enum _prisma_migrations_constraint {
	_prisma_migrations_pkey = "_prisma_migrations_pkey"
}
/** select columns of table "_prisma_migrations" */
export const enum _prisma_migrations_select_column {
	applied_steps_count = "applied_steps_count",
	checksum = "checksum",
	finished_at = "finished_at",
	id = "id",
	logs = "logs",
	migration_name = "migration_name",
	rolled_back_at = "rolled_back_at",
	started_at = "started_at"
}
/** update columns of table "_prisma_migrations" */
export const enum _prisma_migrations_update_column {
	applied_steps_count = "applied_steps_count",
	checksum = "checksum",
	finished_at = "finished_at",
	id = "id",
	logs = "logs",
	migration_name = "migration_name",
	rolled_back_at = "rolled_back_at",
	started_at = "started_at"
}
/** ordering argument of a cursor */
export const enum cursor_ordering {
	ASC = "ASC",
	DESC = "DESC"
}
/** column ordering options */
export const enum order_by {
	asc = "asc",
	asc_nulls_first = "asc_nulls_first",
	asc_nulls_last = "asc_nulls_last",
	desc = "desc",
	desc_nulls_first = "desc_nulls_first",
	desc_nulls_last = "desc_nulls_last"
}

type ZEUS_VARIABLES = {
	["Boolean_array_comparison_exp"]: ValueTypes["Boolean_array_comparison_exp"];
	["Boolean_comparison_exp"]: ValueTypes["Boolean_comparison_exp"];
	["Exam_bool_exp"]: ValueTypes["Exam_bool_exp"];
	["Exam_constraint"]: ValueTypes["Exam_constraint"];
	["Exam_insert_input"]: ValueTypes["Exam_insert_input"];
	["Exam_obj_rel_insert_input"]: ValueTypes["Exam_obj_rel_insert_input"];
	["Exam_on_conflict"]: ValueTypes["Exam_on_conflict"];
	["Exam_order_by"]: ValueTypes["Exam_order_by"];
	["Exam_pk_columns_input"]: ValueTypes["Exam_pk_columns_input"];
	["Exam_select_column"]: ValueTypes["Exam_select_column"];
	["Exam_set_input"]: ValueTypes["Exam_set_input"];
	["Exam_stream_cursor_input"]: ValueTypes["Exam_stream_cursor_input"];
	["Exam_stream_cursor_value_input"]: ValueTypes["Exam_stream_cursor_value_input"];
	["Exam_update_column"]: ValueTypes["Exam_update_column"];
	["Exam_updates"]: ValueTypes["Exam_updates"];
	["GroupMember_aggregate_bool_exp"]: ValueTypes["GroupMember_aggregate_bool_exp"];
	["GroupMember_aggregate_bool_exp_count"]: ValueTypes["GroupMember_aggregate_bool_exp_count"];
	["GroupMember_aggregate_order_by"]: ValueTypes["GroupMember_aggregate_order_by"];
	["GroupMember_arr_rel_insert_input"]: ValueTypes["GroupMember_arr_rel_insert_input"];
	["GroupMember_bool_exp"]: ValueTypes["GroupMember_bool_exp"];
	["GroupMember_constraint"]: ValueTypes["GroupMember_constraint"];
	["GroupMember_insert_input"]: ValueTypes["GroupMember_insert_input"];
	["GroupMember_max_order_by"]: ValueTypes["GroupMember_max_order_by"];
	["GroupMember_min_order_by"]: ValueTypes["GroupMember_min_order_by"];
	["GroupMember_on_conflict"]: ValueTypes["GroupMember_on_conflict"];
	["GroupMember_order_by"]: ValueTypes["GroupMember_order_by"];
	["GroupMember_pk_columns_input"]: ValueTypes["GroupMember_pk_columns_input"];
	["GroupMember_select_column"]: ValueTypes["GroupMember_select_column"];
	["GroupMember_set_input"]: ValueTypes["GroupMember_set_input"];
	["GroupMember_stream_cursor_input"]: ValueTypes["GroupMember_stream_cursor_input"];
	["GroupMember_stream_cursor_value_input"]: ValueTypes["GroupMember_stream_cursor_value_input"];
	["GroupMember_update_column"]: ValueTypes["GroupMember_update_column"];
	["GroupMember_updates"]: ValueTypes["GroupMember_updates"];
	["Group_bool_exp"]: ValueTypes["Group_bool_exp"];
	["Group_constraint"]: ValueTypes["Group_constraint"];
	["Group_insert_input"]: ValueTypes["Group_insert_input"];
	["Group_obj_rel_insert_input"]: ValueTypes["Group_obj_rel_insert_input"];
	["Group_on_conflict"]: ValueTypes["Group_on_conflict"];
	["Group_order_by"]: ValueTypes["Group_order_by"];
	["Group_pk_columns_input"]: ValueTypes["Group_pk_columns_input"];
	["Group_select_column"]: ValueTypes["Group_select_column"];
	["Group_set_input"]: ValueTypes["Group_set_input"];
	["Group_stream_cursor_input"]: ValueTypes["Group_stream_cursor_input"];
	["Group_stream_cursor_value_input"]: ValueTypes["Group_stream_cursor_value_input"];
	["Group_update_column"]: ValueTypes["Group_update_column"];
	["Group_updates"]: ValueTypes["Group_updates"];
	["Int_comparison_exp"]: ValueTypes["Int_comparison_exp"];
	["OrganizationMember_aggregate_bool_exp"]: ValueTypes["OrganizationMember_aggregate_bool_exp"];
	["OrganizationMember_aggregate_bool_exp_count"]: ValueTypes["OrganizationMember_aggregate_bool_exp_count"];
	["OrganizationMember_aggregate_order_by"]: ValueTypes["OrganizationMember_aggregate_order_by"];
	["OrganizationMember_arr_rel_insert_input"]: ValueTypes["OrganizationMember_arr_rel_insert_input"];
	["OrganizationMember_bool_exp"]: ValueTypes["OrganizationMember_bool_exp"];
	["OrganizationMember_constraint"]: ValueTypes["OrganizationMember_constraint"];
	["OrganizationMember_insert_input"]: ValueTypes["OrganizationMember_insert_input"];
	["OrganizationMember_max_order_by"]: ValueTypes["OrganizationMember_max_order_by"];
	["OrganizationMember_min_order_by"]: ValueTypes["OrganizationMember_min_order_by"];
	["OrganizationMember_on_conflict"]: ValueTypes["OrganizationMember_on_conflict"];
	["OrganizationMember_order_by"]: ValueTypes["OrganizationMember_order_by"];
	["OrganizationMember_pk_columns_input"]: ValueTypes["OrganizationMember_pk_columns_input"];
	["OrganizationMember_select_column"]: ValueTypes["OrganizationMember_select_column"];
	["OrganizationMember_set_input"]: ValueTypes["OrganizationMember_set_input"];
	["OrganizationMember_stream_cursor_input"]: ValueTypes["OrganizationMember_stream_cursor_input"];
	["OrganizationMember_stream_cursor_value_input"]: ValueTypes["OrganizationMember_stream_cursor_value_input"];
	["OrganizationMember_update_column"]: ValueTypes["OrganizationMember_update_column"];
	["OrganizationMember_updates"]: ValueTypes["OrganizationMember_updates"];
	["Organization_bool_exp"]: ValueTypes["Organization_bool_exp"];
	["Organization_constraint"]: ValueTypes["Organization_constraint"];
	["Organization_insert_input"]: ValueTypes["Organization_insert_input"];
	["Organization_obj_rel_insert_input"]: ValueTypes["Organization_obj_rel_insert_input"];
	["Organization_on_conflict"]: ValueTypes["Organization_on_conflict"];
	["Organization_order_by"]: ValueTypes["Organization_order_by"];
	["Organization_pk_columns_input"]: ValueTypes["Organization_pk_columns_input"];
	["Organization_select_column"]: ValueTypes["Organization_select_column"];
	["Organization_set_input"]: ValueTypes["Organization_set_input"];
	["Organization_stream_cursor_input"]: ValueTypes["Organization_stream_cursor_input"];
	["Organization_stream_cursor_value_input"]: ValueTypes["Organization_stream_cursor_value_input"];
	["Organization_update_column"]: ValueTypes["Organization_update_column"];
	["Organization_updates"]: ValueTypes["Organization_updates"];
	["Profile_bool_exp"]: ValueTypes["Profile_bool_exp"];
	["Profile_constraint"]: ValueTypes["Profile_constraint"];
	["Profile_insert_input"]: ValueTypes["Profile_insert_input"];
	["Profile_obj_rel_insert_input"]: ValueTypes["Profile_obj_rel_insert_input"];
	["Profile_on_conflict"]: ValueTypes["Profile_on_conflict"];
	["Profile_order_by"]: ValueTypes["Profile_order_by"];
	["Profile_pk_columns_input"]: ValueTypes["Profile_pk_columns_input"];
	["Profile_select_column"]: ValueTypes["Profile_select_column"];
	["Profile_set_input"]: ValueTypes["Profile_set_input"];
	["Profile_stream_cursor_input"]: ValueTypes["Profile_stream_cursor_input"];
	["Profile_stream_cursor_value_input"]: ValueTypes["Profile_stream_cursor_value_input"];
	["Profile_update_column"]: ValueTypes["Profile_update_column"];
	["Profile_updates"]: ValueTypes["Profile_updates"];
	["QuestionType"]: ValueTypes["QuestionType"];
	["QuestionType_comparison_exp"]: ValueTypes["QuestionType_comparison_exp"];
	["Question_aggregate_bool_exp"]: ValueTypes["Question_aggregate_bool_exp"];
	["Question_aggregate_bool_exp_bool_and"]: ValueTypes["Question_aggregate_bool_exp_bool_and"];
	["Question_aggregate_bool_exp_bool_or"]: ValueTypes["Question_aggregate_bool_exp_bool_or"];
	["Question_aggregate_bool_exp_count"]: ValueTypes["Question_aggregate_bool_exp_count"];
	["Question_aggregate_order_by"]: ValueTypes["Question_aggregate_order_by"];
	["Question_arr_rel_insert_input"]: ValueTypes["Question_arr_rel_insert_input"];
	["Question_bool_exp"]: ValueTypes["Question_bool_exp"];
	["Question_constraint"]: ValueTypes["Question_constraint"];
	["Question_insert_input"]: ValueTypes["Question_insert_input"];
	["Question_max_order_by"]: ValueTypes["Question_max_order_by"];
	["Question_min_order_by"]: ValueTypes["Question_min_order_by"];
	["Question_on_conflict"]: ValueTypes["Question_on_conflict"];
	["Question_order_by"]: ValueTypes["Question_order_by"];
	["Question_pk_columns_input"]: ValueTypes["Question_pk_columns_input"];
	["Question_select_column"]: ValueTypes["Question_select_column"];
	["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"]: ValueTypes["Question_select_column_Question_aggregate_bool_exp_bool_and_arguments_columns"];
	["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"]: ValueTypes["Question_select_column_Question_aggregate_bool_exp_bool_or_arguments_columns"];
	["Question_set_input"]: ValueTypes["Question_set_input"];
	["Question_stream_cursor_input"]: ValueTypes["Question_stream_cursor_input"];
	["Question_stream_cursor_value_input"]: ValueTypes["Question_stream_cursor_value_input"];
	["Question_update_column"]: ValueTypes["Question_update_column"];
	["Question_updates"]: ValueTypes["Question_updates"];
	["ScheduledExam_aggregate_bool_exp"]: ValueTypes["ScheduledExam_aggregate_bool_exp"];
	["ScheduledExam_aggregate_bool_exp_count"]: ValueTypes["ScheduledExam_aggregate_bool_exp_count"];
	["ScheduledExam_aggregate_order_by"]: ValueTypes["ScheduledExam_aggregate_order_by"];
	["ScheduledExam_arr_rel_insert_input"]: ValueTypes["ScheduledExam_arr_rel_insert_input"];
	["ScheduledExam_bool_exp"]: ValueTypes["ScheduledExam_bool_exp"];
	["ScheduledExam_constraint"]: ValueTypes["ScheduledExam_constraint"];
	["ScheduledExam_insert_input"]: ValueTypes["ScheduledExam_insert_input"];
	["ScheduledExam_max_order_by"]: ValueTypes["ScheduledExam_max_order_by"];
	["ScheduledExam_min_order_by"]: ValueTypes["ScheduledExam_min_order_by"];
	["ScheduledExam_on_conflict"]: ValueTypes["ScheduledExam_on_conflict"];
	["ScheduledExam_order_by"]: ValueTypes["ScheduledExam_order_by"];
	["ScheduledExam_pk_columns_input"]: ValueTypes["ScheduledExam_pk_columns_input"];
	["ScheduledExam_select_column"]: ValueTypes["ScheduledExam_select_column"];
	["ScheduledExam_set_input"]: ValueTypes["ScheduledExam_set_input"];
	["ScheduledExam_stream_cursor_input"]: ValueTypes["ScheduledExam_stream_cursor_input"];
	["ScheduledExam_stream_cursor_value_input"]: ValueTypes["ScheduledExam_stream_cursor_value_input"];
	["ScheduledExam_update_column"]: ValueTypes["ScheduledExam_update_column"];
	["ScheduledExam_updates"]: ValueTypes["ScheduledExam_updates"];
	["String_array_comparison_exp"]: ValueTypes["String_array_comparison_exp"];
	["String_comparison_exp"]: ValueTypes["String_comparison_exp"];
	["_prisma_migrations_bool_exp"]: ValueTypes["_prisma_migrations_bool_exp"];
	["_prisma_migrations_constraint"]: ValueTypes["_prisma_migrations_constraint"];
	["_prisma_migrations_inc_input"]: ValueTypes["_prisma_migrations_inc_input"];
	["_prisma_migrations_insert_input"]: ValueTypes["_prisma_migrations_insert_input"];
	["_prisma_migrations_on_conflict"]: ValueTypes["_prisma_migrations_on_conflict"];
	["_prisma_migrations_order_by"]: ValueTypes["_prisma_migrations_order_by"];
	["_prisma_migrations_pk_columns_input"]: ValueTypes["_prisma_migrations_pk_columns_input"];
	["_prisma_migrations_select_column"]: ValueTypes["_prisma_migrations_select_column"];
	["_prisma_migrations_set_input"]: ValueTypes["_prisma_migrations_set_input"];
	["_prisma_migrations_stream_cursor_input"]: ValueTypes["_prisma_migrations_stream_cursor_input"];
	["_prisma_migrations_stream_cursor_value_input"]: ValueTypes["_prisma_migrations_stream_cursor_value_input"];
	["_prisma_migrations_update_column"]: ValueTypes["_prisma_migrations_update_column"];
	["_prisma_migrations_updates"]: ValueTypes["_prisma_migrations_updates"];
	["cursor_ordering"]: ValueTypes["cursor_ordering"];
	["order_by"]: ValueTypes["order_by"];
	["timestamp"]: ValueTypes["timestamp"];
	["timestamp_comparison_exp"]: ValueTypes["timestamp_comparison_exp"];
	["timestamptz"]: ValueTypes["timestamptz"];
	["timestamptz_comparison_exp"]: ValueTypes["timestamptz_comparison_exp"];
}