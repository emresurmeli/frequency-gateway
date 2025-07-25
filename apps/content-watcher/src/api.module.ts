import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiService } from './api.service';
import { HealthController, ScanControllerV1, SearchControllerV1, WebhookControllerV1 } from './controllers';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { ScannerModule } from '#content-watcher-lib/scanner/scanner.module';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import { CacheModule } from '#cache/cache.module';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import { ConfigModule } from '@nestjs/config';
import apiConfig from './api.config';
import { noProviderBlockchainConfig } from '#blockchain/blockchain.config';
import { QueueModule } from '#queue/queue.module';
import ipfsConfig from '#storage/ipfs/ipfs.config';
import scannerConfig from '#content-watcher-lib/scanner/scanner.config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '#utils/filters/exceptions.filter';
import pubsubConfig from '#content-watcher/pubsub/pubsub.config';
import { PubSubModule } from '#content-watcher/pubsub/pubsub.module';
import { CrawlerModule } from '#content-watcher/crawler/crawler.module';
import { IPFSProcessorModule } from '#content-watcher/ipfs/ipfs.processor.module';
import httpCommonConfig from '#config/http-common.config';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        apiConfig,
        noProviderBlockchainConfig,
        cacheConfig,
        ipfsConfig,
        scannerConfig,
        pubsubConfig,
        httpCommonConfig,
      ],
    }),
    ScheduleModule.forRoot(),
    BlockchainModule.forRootAsync({
      readOnly: true,
    }),
    ScannerModule,
    CrawlerModule,
    IPFSProcessorModule,
    PubSubModule,
    CacheModule.forRootAsync({
      useFactory: (conf: ICacheConfig) => [{ ...conf.redisOptions, keyPrefix: conf.cacheKeyPrefix }],
      inject: [cacheConfig.KEY],
    }),
    LoggerModule.forRoot(getPinoHttpOptions()),
    QueueModule.forRoot({ enableUI: true, ...QueueConstants.CONFIGURED_QUEUES }),
    EventEmitterModule.forRoot({
      // Use this instance throughout the application
      global: true,
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
  ],
  providers: [
    ApiService,
    // global exception handling
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  // Controller order determines the order of display for docs
  // v[Desc first][ABC Second], Health, and then Dev only last
  controllers: [ScanControllerV1, SearchControllerV1, WebhookControllerV1, HealthController],
  exports: [ScheduleModule],
})
export class ApiModule {}
