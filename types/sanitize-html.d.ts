declare module "sanitize-html" {
  export interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowProtocolRelative?: boolean;
    allowedStyles?: Record<string, Record<string, RegExp[]>>;
    transformTags?: Record<
      string,
      | string
      | ((
          tagName: string,
          attribs: Record<string, string>
        ) => { tagName: string; attribs: Record<string, string> })
    >;
  }

  interface SanitizeHtml {
    (dirty: string, options?: IOptions): string;
    simpleTransform(
      tagName: string,
      attributes?: Record<string, string>
    ): (
      tagName: string,
      attribs: Record<string, string>
    ) => { tagName: string; attribs: Record<string, string> };
  }

  const sanitizeHtml: SanitizeHtml;

  export default sanitizeHtml;
}
