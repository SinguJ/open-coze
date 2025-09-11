import wildcard from 'wildcard';
import { Args, Logger } from '@/runtime';
import { FilesFilesItems, Input, Output } from "@/typings/ExtractFiles/ExtractFiles";

function toArray(s: string, arr: string[]): string[] {
  let strs = [];
  if (s) {
    strs.push(s);
  }
  if (arr) {
    return strs.concat(arr);
  }
  return strs;
}

function filterByType(logger: Logger, types: string[]): (arg0: FilesFilesItems) => boolean {
  return function (file: FilesFilesItems): boolean {
    let v = types.filter(type => file.Type === type).length > 0;
    logger.debug(file.URL, file.Type, types, v);
    return v;
  }
}

function filterByName(logger: Logger, exprs: string[]): (arg0: FilesFilesItems) => boolean {
  return function (file: FilesFilesItems): boolean {
    let v = exprs.filter(expr => wildcard(expr, file.Name)).length > 0;
    logger.debug(file.URL, file.Name, exprs, v);
    return v;
  }
}

function filterByMediaType(logger: Logger, exprs: string[]): (arg0: FilesFilesItems) => boolean {
  return function (file: FilesFilesItems): boolean {
    let v = exprs.filter(expr => wildcard(expr, file.MediaType)).length > 0;
    logger.debug(file.URL, file.MediaType, exprs, v);
    return v;
  }
}

export async function handler({ input, logger }: Args<Input>): Promise<Output> {
  let {
    Files,
    FilterByType, FilterByTypes,
    FilterByName, FilterByNames,
    FilterByMediaType, FilterByMediaTypes,
  } = input;

  let types = toArray(FilterByType, FilterByTypes);
  let names = toArray(FilterByName, FilterByNames);
  let mimes = toArray(FilterByMediaType, FilterByMediaTypes);

  let filters = Files;
  if (types && types.length > 0) {
    filters = filters.filter(filterByType(logger, types));
  }
  if (names && names.length > 0) {
    filters = filters.filter(filterByName(logger, names));
  }
  if (mimes && mimes.length > 0) {
    filters = filters.filter(filterByMediaType(logger, mimes));
  }
  logger.debug(filters);

  return {
    Files: filters,
    FileURLs: filters.map(file => file.URL),
    FirstFile: filters ? filters[0] : undefined,
    FirstFileURL: filters ? filters[0].URL : undefined,
  }
};