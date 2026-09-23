/* eslint-disable no-console */
import { Client as ESClient } from "@elastic/elasticsearch";
import { InternalLogger } from "./logger.base";
import { ElasticSearchLogger } from "./logger.elastic-search";

export class ElasticSearchServerlessLogger extends ElasticSearchLogger {
  static async create(
    cloudId: string,
    apiKey: string,
    indexNamespace: string,
    createIndices: boolean,
  ): Promise<InternalLogger> {
    const client = new ESClient({
      cloud: {
        id: cloudId,
      },
      auth: {
        apiKey,
      },
      serverMode: "serverless",
    });
    const { logsIndex, statsIndex } = await this.initialize(client, indexNamespace, createIndices);

    return new ElasticSearchServerlessLogger(client, logsIndex, statsIndex);
  }
}
