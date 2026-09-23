/* eslint-disable no-console */
import { Client as ESClient } from "@elastic/elasticsearch";
import { InternalLogger } from "./logger.base";
import { ElasticSearchLogger } from "./logger.elastic-search";

export class ElasticSearchCloudLogger extends ElasticSearchLogger {
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
      serverMode: "stack",
    });
    const { logsIndex, statsIndex } = await this.initialize(client, indexNamespace, createIndices);

    return new ElasticSearchCloudLogger(client, logsIndex, statsIndex);
  }
}
