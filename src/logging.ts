import { Logger, ILogObj } from "tslog";

export const log: Logger<ILogObj> = new Logger({
  prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t",
});
