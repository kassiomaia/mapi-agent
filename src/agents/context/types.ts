export type CityEntity = Readonly<{
  kind: "City";
  id: string;
  name: string;
}>;

export type Entity = CityEntity;

export type Turn = Readonly<{
  prompt: string;
  accepted: boolean;
  mentions: ReadonlyArray<string>;
}>;

export type ChatContext = Readonly<{
  registerToolCall: (toolName: string, input: unknown) => void;
  recordTurn: (prompt: string, accepted: boolean) => void;
  describe: () => string;
}>;
