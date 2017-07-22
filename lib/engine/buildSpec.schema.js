module.exports = {
  type: 'object',
  fields: {

    paths: {
      type: 'object',
      optional: true,
      fields: {

        src: {
          type: 'string',
          default: 'src',
        },
        dist: {
          type: 'string',
          default: 'dist',
        },

      },
    },

    pages: {
      type: 'array',
      minElements: 1,
      elementType: {
        type: 'object',
        fields: {

          src: {
            type: 'string',
          },
          dist: {
            type: 'string',
          },
          data: {
            type: 'array',
            optional: true,
            elementType: {
              type: 'string',
            },
          },
          styles: {
            type: 'array',
            optional: true,
            elementType: {
              type: 'string',
            },
          },
          scripts: {
            type: 'array',
            optional: true,
            elementType: {
              type: 'string',
            },
          },

        },
      },
    },

    global: {
      type: 'object',
      optional: true,
      fields: {

        styles: {
          type: 'array',
          elementType: 'string',
          optional: true,
        },
        scripts: {
          type: 'array',
          elementType: 'string',
          optional: true,
        },

      },
    },

    verbatim: {
      type: 'array',
      optional: true,
    }
  },
};
