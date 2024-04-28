
#define REGEX_PARSE_OK 0
#define REGEX_PARSE_END 100

unsigned int validateRegex(char *first, 
                           char *last);

unsigned int compileRegex(void *tree, 
                          char *first, 
                          char *last, 
                          char caseInsensitive,
                          unsigned short *vocabularywidth,
                          unsigned short *stateswidth,
                          unsigned int *regexStateMachineOffset);

unsigned char evaluateRegex(void *tree,
                            char *first,
                            unsigned short width,
                            char caseInsensitive, 
                            unsigned short vocabularywidth,
                            unsigned short stateswidth,
                            unsigned int regexStateMachineOffset);