
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "rules.h"
#include "rete.h"
#include "regex.h"

#define REGEX_SYMBOL 0x00
#define REGEX_UNION 0x01
#define REGEX_STAR 0x02
#define REGEX_PLUS 0x03
#define REGEX_QUESTION 0x04
#define REGEX_INTERVAL 0x05
#define REGEX_REGEX 0x06
#define REGEX_DOT 0xFFFE

#define MAX_TRANSITIONS 4096
#define MAX_QUEUE 1024
#define MAX_STATES 4096
#define MAX_HSET 8192
#define MAX_SET 8192
#define MAX_LIST 1024
#define MAX_INTERVAL 100
#define MAX_REFCOUNT 1000


#define CREATE_QUEUE(type) \
    type queue[MAX_QUEUE]; \
    unsigned short first = 0; \
    unsigned short last = 0; \

#define ENQUEUE(value) do { \
    if ((last + 1) == first) { \
        return ERR_REGEX_QUEUE_FULL; \
    } \
    queue[last] = value; \
    last = (last + 1) % MAX_QUEUE; \
} while(0)

#define DEQUEUE(value) do { \
    if (first == last) { \
        *value = 0; \
    } else { \
        *value = queue[first]; \
        first = (first + 1) % MAX_QUEUE; \
    } \
} while(0)

#define CREATE_LIST(type) \
    type list[MAX_QUEUE]; \
    unsigned short top = 0;

#define LIST_EMPTY() !top

#define ADD(value) do { \
    if ((top + 1) == MAX_LIST) { \
        return ERR_REGEX_LIST_FULL; \
    } \
    list[top++] = value; \
    for (unsigned short i = top - 1; (i > 0) && (list[i]->id < list[i - 1]->id); --i) {\
        state *temp = list[i]; list[i] = list[i - 1]; list[i - 1] = temp; \
    } \
} while(0)

#define LIST list, top

#define CREATE_HASHSET(type) \
    type hset[MAX_HSET] = {0}; \

#define HSET(value) do { \
    unsigned short size = 0; \
    unsigned short index = value->hash % MAX_HSET; \
    while (hset[index]) { \
        index = (index + 1) % MAX_HSET; \
        ++size; \
        if (size == MAX_HSET) { \
            return ERR_REGEX_SET_FULL; \
        } \
    } \
    hset[index] = value; \
} while(0)

#define HGET(valueHash, value) do { \
    unsigned short size = 0; \
    unsigned short index = valueHash % MAX_HSET; \
    *value = NULL; \
    while (hset[index] && !*value && size < MAX_HSET) { \
        if (hset[index]->hash == valueHash) { \
            *value = hset[index]; \
        } \
        ++size; \
        index = (index + 1) % MAX_HSET; \
    } \
} while(0)

#define HASHSET hset

#define CREATE_SET(type) \
    type set[MAX_SET] = {0}; \

#define SET(value) do { \
    unsigned short size = 0; \
    unsigned short i = value % MAX_SET; \
    while (set[i]) { \
        i = (i + 1) % MAX_SET; \
        ++size; \
        if (size == MAX_SET) { \
            return ERR_REGEX_SET_FULL; \
        } \
    } \
    set[i] = value; \
} while(0)

#define EXISTS(value, result) do { \
    unsigned short size = 0; \
    unsigned short i = value % MAX_SET; \
    *result = 0; \
    while (set[i] && !*result && size < MAX_SET) { \
        if (set[i] == value) { \
            *result = 1; \
        } \
        ++size; \
        i = (i + 1) % MAX_SET; \
    } \
} while(0)

#define CREATE_STATE(stateId, newState) do { \
    unsigned int result = createState(stateId, newState); \
    if (result != RULES_OK) { \
        return result; \
    } \
} while (0)

#define LINK_STATES(previousState, nextState, tokenSymbol) do { \
    unsigned int result = linkStates(previousState, nextState, tokenSymbol, 0); \
    if (result != RULES_OK) { \
        return result; \
    } \
} while (0)

#define LINK_STATES_D(previousState, nextState, tokenSymbol) do { \
    unsigned int result = linkStates(previousState, nextState, tokenSymbol, 1); \
    if (result != RULES_OK) { \
        return result; \
    } \
} while (0)

struct state;

typedef struct transition {
    unsigned short deterministic;
    unsigned int symbol;
    struct state *next;
} transition;

typedef struct state {
    unsigned int hash;
    unsigned short refCount;
    unsigned short id;
    unsigned short transitionswidth;
    unsigned char isAccept;
    unsigned char isReject;
    transition transitions[MAX_TRANSITIONS];
} state;

typedef struct token {
    unsigned char type;
    unsigned short low;
    unsigned short high;
    unsigned short symbolswidth;
    unsigned int symbols[MAX_TRANSITIONS];
    unsigned short inverseSymbolswidth;
    unsigned int inverseSymbols[MAX_TRANSITIONS];
} token;

typedef struct symbolEntry {
    unsigned int symbol;
    unsigned short index;
} symbolEntry;

static const unsigned int UTF8_OFFSETS[6] = {
    0x00000000UL, 0x00003080UL, 0x000E2080UL,
    0x03C82080UL, 0xFA082080UL, 0x82082080UL
};

static const char UTF8_TRAILING[256] = {
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3,4,4,4,4,5,5,5,5
};

static const unsigned int EMPTY = 0;

unsigned int utf8ToUnicode(char **first, char *last, unsigned int *result) {
    unsigned char byteNumber = UTF8_TRAILING[(unsigned char)*first[0]];
    if (*first + byteNumber >= last) {
        return ERR_PARSE_REGEX;
    }
    *result = 0;
    switch (byteNumber) {
        case 3: 
            *result += (unsigned char)*first[0]; 
            *result <<= 6;
            ++*first;
        case 2: 
            *result += (unsigned char)*first[0]; 
            *result <<= 6;
            ++*first;
        case 1:
            *result += (unsigned char)*first[0]; 
            *result <<= 6;
            ++*first;
        case 0:
            *result += (unsigned char)*first[0];
            ++*first;
    }
    *result -= UTF8_OFFSETS[byteNumber];
    return REGEX_PARSE_OK;
}

static unsigned int readInternalRange(char *first,
                                      unsigned short *rangewidth,
                                      unsigned int *range);

static unsigned int readEscapedSymbol(char **first, 
                                      char *last,
                                      unsigned short *rangewidth,
                                      unsigned int *range) {
    ++*first;
    if (*first >= last) {
        return ERR_PARSE_REGEX;
    }

    switch (*first[0]) {
        case '.':
        case '|':
        case '?':
        case '*':
        case '+':
        case '(':
        case ')':
        case '[':
        case ']':
        case '{':
        case '}':
        case '%':
            range[*rangewidth] = *first[0];
            ++*rangewidth;
            ++*first;
            return REGEX_PARSE_OK;
        case 'a':
            ++*first;
            return readInternalRange("[\x41-\x5A\x61-\x7A\xC3\x80-\xC3\x96\xC3\x98-\xC3\xB6\xC3\xB8-\xC3\xBF]", rangewidth, range);
        case 'c':
            ++*first;
            return readInternalRange("[\x00-\x1F\x7F\xC2\x80-\xC2\x9F]", rangewidth, range);
        case 'd':
            ++*first;
            return readInternalRange("[0-9]", rangewidth, range);
        case 'g':
            ++*first;
            return readInternalRange("[\x21-\x7E]", rangewidth, range);
        case 'l':
            ++*first;
            return readInternalRange("[\x61-\x7A\xC3\x9F-\xC3\xB6\xC3\xB8-\xC3\xBF]", rangewidth, range);
        case 'p':
            ++*first;
            return readInternalRange("[.,;:?!'\"()\xC2\xA1\xC2\xBF-]", rangewidth, range);
        case 's':
            ++*first;
            return readInternalRange("[\x09-\x0D\x20]", rangewidth, range);
        case 'u':
            ++*first;
            return readInternalRange("[\x41-\x5A\xC3\x80-\xC3\x96\xC3\x98-\xC3\x9E]", rangewidth, range);
        case 'w':
            ++*first;
            return readInternalRange("[A-Za-z0-9]", rangewidth, range);
        case 'x':
            ++*first;
            return readInternalRange("[0-9A-Fa-f]", rangewidth, range);
    }

    return ERR_PARSE_REGEX;
}

static unsigned int readRange(char **first,
                              char *last, 
                              unsigned short *rangewidth,
                              unsigned int *range,
                              unsigned short *inverseRangewidth,
                              unsigned int *inverseRange) {
    unsigned char parseBegin = 1;
    unsigned int lastSymbol = 0;
    unsigned int currentSymbol;
    unsigned char inverse = 0;
    unsigned int result;
    *rangewidth = 0;
    if (inverseRangewidth) {
        *inverseRangewidth = 0;
    }

    ++*first;
    if (*first[0] == '^') {
        if (*first == last) {
            return ERR_PARSE_REGEX;
        }

        inverse = 1;
        ++*first;
    }

    if (*first[0] == ']') {
        if (*first == last) {
            return ERR_PARSE_REGEX;
        }
        
        if (inverse) {
            inverseRange[*inverseRangewidth] = (unsigned int)']';
            ++*inverseRangewidth;
        } else {
            range[*rangewidth] = (unsigned int)']';
            ++*rangewidth;
        } 
    }

    while (*first[0] != ']') {
        if (*first == last) {
            return ERR_PARSE_REGEX;
        }

        if (!parseBegin) {
            if (!lastSymbol) {
                return ERR_PARSE_REGEX;
            }

            result = utf8ToUnicode(first, last, &currentSymbol);
            if (result != REGEX_PARSE_OK) {
                return result;
            }

            while (currentSymbol != lastSymbol) {
                if (inverse) {
                    inverseRange[*inverseRangewidth] = currentSymbol;
                    ++*inverseRangewidth;
                } else {
                    range[*rangewidth] = currentSymbol;
                    ++*rangewidth;
                } 

                if (currentSymbol > lastSymbol) {
                    --currentSymbol;
                } else {
                    ++currentSymbol;
                }
            }
            parseBegin = 1;
        } else {
            if (*first[0] == '-') {
                parseBegin = 0;
                ++*first;
            } else {
                if (*first[0] != '%') {
                    result = utf8ToUnicode(first, last, &currentSymbol);
                    if (result != REGEX_PARSE_OK) {
                        return result;
                    }

                    if (inverse) {
                        inverseRange[*inverseRangewidth] = currentSymbol;
                        ++*inverseRangewidth;
                    } else {
                        range[*rangewidth] = currentSymbol;
                        ++*rangewidth;
                    } 
                    lastSymbol = currentSymbol;
                } else {
                    if (inverse) {
                        unsigned int result = readEscapedSymbol(first, last, inverseRangewidth, inverseRange);
                        if (result != REGEX_PARSE_OK) {
                            return result;
                        }
                    } else {
                        unsigned int result = readEscapedSymbol(first, last, rangewidth, range);
                        if (result != REGEX_PARSE_OK) {
                            return result;
                        }
                    }
                    lastSymbol = 0;
                }
            }
        } 
    }

    if (!parseBegin) {
        if (inverse) {
            inverseRange[*inverseRangewidth] = (unsigned int)'-';
            ++*inverseRangewidth;
        } else {
            range[*rangewidth] = (unsigned int)'-';
            ++*rangewidth;
        } 
    }

    ++*first;
    return REGEX_PARSE_OK;
}

static unsigned int readInternalRange(char *first,
                                      unsigned short *rangewidth,
                                      unsigned int *range) {
    unsigned int width = strlen(first);
    return readRange(&first, first + width - 1, rangewidth, range, NULL, NULL);
}

static unsigned int readInterval(char **first,
                                 char *last,
                                 unsigned short *low,
                                 unsigned short *high) {

    ++*first;
    unsigned char parseBegin = 1;
    char *numberBegin = *first;
    while (*first[0] != '}') {
        if (*first == last) {
            return ERR_PARSE_REGEX;
        }
        
        if (parseBegin) {    
            if (*first[0] == ',' && numberBegin != *first) {
                parseBegin = 0;
                *first[0] = '\0';
                *low = atoi(numberBegin);
                *first[0] = ',';
                numberBegin = *first + 1; 
            }  else if (*first[0] > '9' || *first[0] < 0) {
                return ERR_PARSE_REGEX;
            }
        } else if (*first[0] > '9' || *first[0] < 0) {
            return ERR_PARSE_REGEX;
        }

        ++*first;
    }

    if (numberBegin == *first) {
        *high = 0;
    } else {
        *first[0] = '\0';
        *high = atoi(numberBegin);
        *first[0] = '}';

        if (parseBegin) {
            *low = *high;  
        }
    } 

    if ((*high && *low > *high) || *high > MAX_INTERVAL) {
        return ERR_PARSE_REGEX;
    }

    ++*first;
    return REGEX_PARSE_OK;
}

static unsigned int readNextToken(char **first, 
                                  char *last, 
                                  token *nextToken) {
    unsigned int result = REGEX_PARSE_OK;
    nextToken->low = 0;
    nextToken->high = 0;
    nextToken->symbolswidth = 0;
    nextToken->inverseSymbolswidth = 0;
    if (*first >= last) {
        return REGEX_PARSE_END;
    }

    switch (*first[0]) {
        case '|':
            nextToken->type = REGEX_UNION;
            break;
        case '?':
            nextToken->type = REGEX_QUESTION;
            break;
        case '*':
            nextToken->type = REGEX_STAR;
            break;
        case '+':
            nextToken->type = REGEX_PLUS;
            break;
        case '(':
            nextToken->type = REGEX_REGEX;
            break;
        case ')':
            nextToken->type = REGEX_REGEX;
            result = REGEX_PARSE_END;
            break;
        case '[':
            nextToken->type = REGEX_SYMBOL;
            return readRange(first, last, &nextToken->symbolswidth,
                                          nextToken->symbols,
                                          &nextToken->inverseSymbolswidth,
                                          nextToken->inverseSymbols);
        case '{':
            nextToken->type = REGEX_INTERVAL;
            return readInterval(first, last, &nextToken->low, &nextToken->high);
        case '%':
            nextToken->type = REGEX_SYMBOL;
            return readEscapedSymbol(first, last, &nextToken->symbolswidth, nextToken->symbols);
        case '.':
            nextToken->type = REGEX_SYMBOL;
            nextToken->symbolswidth = 1;
            nextToken->symbols[0] = REGEX_DOT;
            break;
        default:
            nextToken->type = REGEX_SYMBOL;
            nextToken->symbolswidth = 1;
            return utf8ToUnicode(first, last, &nextToken->symbols[0]);
    }

    ++*first;
    return result;
}

static unsigned int storeRegexStateMachine(ruleset *tree,
                                           unsigned short vocabularywidth,
                                           unsigned short stateswidth,
                                           void **newStateMachine, 
                                           unsigned int *stateMachineOffset) {

    unsigned int stateMachinewidth = sizeof(symbolEntry) * vocabularywidth * 2;
    stateMachinewidth = stateMachinewidth + sizeof(unsigned short) * stateswidth * vocabularywidth;
    stateMachinewidth = stateMachinewidth + sizeof(unsigned char) * stateswidth;
    if (!tree->regexStateMachinePool) {
        tree->regexStateMachinePool = malloc(stateMachinewidth);
        if (!tree->regexStateMachinePool) {
            return ERR_OUT_OF_MEMORY;
        }

        memset(tree->regexStateMachinePool, 0, stateMachinewidth);
        *stateMachineOffset = 0;
        *newStateMachine = &tree->regexStateMachinePool[0];
        tree->regexStateMachineOffset = stateMachinewidth;
    } else {
        tree->regexStateMachinePool = realloc(tree->regexStateMachinePool, tree->regexStateMachineOffset + stateMachinewidth);
        if (!tree->regexStateMachinePool) {
            return ERR_OUT_OF_MEMORY;
        }

        memset(&tree->regexStateMachinePool[tree->regexStateMachineOffset], 0, stateMachinewidth);
        *stateMachineOffset = tree->regexStateMachineOffset;
        *newStateMachine = &tree->regexStateMachinePool[tree->regexStateMachineOffset];
        tree->regexStateMachineOffset = tree->regexStateMachineOffset + stateMachinewidth;
    }

    return RULES_OK;
}

static unsigned int createState(unsigned short *stateId, 
                                state **newState) {
    if (*stateId == MAX_STATES) {
        return ERR_REGEX_MAX_STATES;
    }
    *newState = malloc(sizeof(state));
    if (*newState == NULL) {
        return ERR_OUT_OF_MEMORY;
    }
    (*newState)->id = *stateId;
    (*newState)->transitionswidth = 0;
    (*newState)->refCount = 0;
    (*newState)->isAccept = 0;
    (*newState)->isReject = 0;
    (*newState)->hash = 0;
    ++*stateId;

    return RULES_OK;
}

static unsigned int linkStates(state *previousState, 
                               state *nextState, 
                               unsigned int tokenSymbol,
                               unsigned short deterministic) {
    for (int i = 0; i < previousState->transitionswidth; ++i) {
        if (previousState->transitions[i].symbol == tokenSymbol && 
            previousState->transitions[i].next->id == nextState->id) {
            return RULES_OK;
        }
    }

    previousState->transitions[previousState->transitionswidth].deterministic = deterministic;
    previousState->transitions[previousState->transitionswidth].symbol = tokenSymbol;
    previousState->transitions[previousState->transitionswidth].next = nextState;
    ++previousState->transitionswidth;
    ++nextState->refCount;
    return RULES_OK;
}

static void deleteTransition(state *previousState, unsigned short index) {
    state *nextState = previousState->transitions[index].next;
    --nextState->refCount;
    if (!nextState->refCount) {
        free(nextState);
    }

    for (unsigned short i = index + 1; i < previousState->transitionswidth; ++i) {
        previousState->transitions[i - 1].deterministic = previousState->transitions[i].deterministic;
        previousState->transitions[i - 1].symbol = previousState->transitions[i].symbol;
        previousState->transitions[i - 1].next = previousState->transitions[i].next;
    }
    --previousState->transitionswidth;
}

static void unlinkStates(state *previousState, 
                         state *nextState, 
                         unsigned int tokenSymbol) {
    unsigned short nextId = nextState->id;
    for (int i = 0; i < previousState->transitionswidth; ++i) {
        if (previousState->transitions[i].symbol == tokenSymbol && 
            previousState->transitions[i].next->id == nextId) {
            deleteTransition(previousState, i);
        }
    }
}

#ifdef _PRINT
static unsigned int printGraph(state *start) {
    CREATE_QUEUE(state*);
    unsigned char visited[MAX_STATES] = {0};
    state *currentState = start;        
    visited[currentState->id] = 1;
    while (currentState) {
        printf("State %d\n", currentState->id);
        if (currentState->isAccept) {
            printf("    Accept\n");
        }
        if (currentState->isReject) {
            printf("    Reject\n");
        }
        for (int i = 0; i < currentState->transitionswidth; ++ i) {
            transition *currentTransition = &currentState->transitions[i];
            printf("    transition %x to state %d deterministic %d\n", currentTransition->symbol, currentTransition->next->id, currentTransition->deterministic);
            if (!visited[currentTransition->next->id]) {
                visited[currentTransition->next->id] = 1;
                ENQUEUE(currentTransition->next);
            }
        }

        DEQUEUE(&currentState);    
    }

    return RULES_OK;
}
#endif

static unsigned int cloneGraph(state *startState,
                               state *endState,
                               unsigned short *id,
                               state **newStart,
                               state **newEnd) {
    CREATE_QUEUE(state*);
    state *visited[MAX_STATES] = { NULL };
    state *currentState = startState;
    CREATE_STATE(id, &visited[currentState->id]);
    while (currentState) {
        if (currentState->isAccept) {
            visited[currentState->id]->isAccept = 1;
        }

        if (currentState->isReject) {
            visited[currentState->id]->isReject = 1;
        }

        for (int i = 0; i < currentState->transitionswidth; ++ i) {
            transition *currentTransition = &currentState->transitions[i];
            
            if (!visited[currentTransition->next->id]) {
                CREATE_STATE(id, &visited[currentTransition->next->id]);
                ENQUEUE(currentTransition->next);
            }

            LINK_STATES(visited[currentState->id], visited[currentTransition->next->id], currentTransition->symbol);
        }

        DEQUEUE(&currentState);    
    }

    *newStart = visited[startState->id];
    *newEnd = visited[endState->id];
    return RULES_OK;
}

static unsigned int createGraph(char **first, 
                                char *last, 
                                unsigned short *id, 
                                state **startState, 
                                state **endState) {
    CREATE_STATE(id, startState);
    CREATE_STATE(id, endState);
    state *previousState = *startState;
    state *currentState = *startState;

    token currentToken;
    unsigned int result = readNextToken(first, last, &currentToken);
    while (result == REGEX_PARSE_OK) {
        switch (currentToken.type) {
            case REGEX_SYMBOL:
                previousState = currentState;
                if (currentToken.symbolswidth) {
                    CREATE_STATE(id, &currentState);
                    for (unsigned short i = 0; i < currentToken.symbolswidth; ++i) {
                        LINK_STATES(previousState, currentState, currentToken.symbols[i]);
                    }
                } 

                if (currentToken.inverseSymbolswidth) {
                    CREATE_STATE(id, &currentState);
                    currentState->isReject = 1;
                    for (unsigned short i = 0; i < currentToken.inverseSymbolswidth; ++i) {
                        LINK_STATES_D(previousState, currentState, currentToken.inverseSymbols[i]);
                    }

                    CREATE_STATE(id, &currentState);
                    LINK_STATES(previousState, currentState, REGEX_DOT);    
                }                

                break;
            case REGEX_UNION:
                LINK_STATES(currentState, *endState, EMPTY);
                CREATE_STATE(id, &currentState);
                previousState = *startState;
                LINK_STATES(previousState, currentState, EMPTY);
                break;
            case REGEX_STAR:
                {
                    state *anchorState;
                    CREATE_STATE(id, &anchorState);
                    LINK_STATES(currentState, previousState, EMPTY);
                    LINK_STATES(currentState, anchorState, EMPTY);
                    LINK_STATES(previousState, anchorState, EMPTY);
                    previousState = currentState;
                    currentState = anchorState;
                }
                break;
            case REGEX_PLUS:
                {
                    state *anchorState;
                    CREATE_STATE(id, &anchorState);
                    LINK_STATES(currentState, previousState, EMPTY);
                    LINK_STATES(currentState, anchorState, EMPTY);
                    previousState = currentState;
                    currentState = anchorState;
                }
                break;
            case REGEX_QUESTION:
                {
                    state *anchorState;
                    CREATE_STATE(id, &anchorState);
                    LINK_STATES(currentState, anchorState, EMPTY);
                    LINK_STATES(previousState, anchorState, EMPTY);
                    previousState = currentState;
                    currentState = anchorState;
                }
                break;
            case REGEX_REGEX:
                {
                    state *subStart;
                    state *subEnd;
                    result = createGraph(first, last, id, &subStart, &subEnd);
                    if (result != REGEX_PARSE_OK) {
                        return result;
                    }
                    
                    LINK_STATES(currentState, subStart, EMPTY);
                    previousState = currentState;
                    currentState = subEnd;
                }
                break;
            case REGEX_INTERVAL: 
                {
                    state *newCurrent = NULL;
                    state *newPrevious = NULL;
                    state *subStart = previousState;
                    state *subEnd = currentState;
                    state *anchorState;
                    CREATE_STATE(id, &anchorState);
                    for (unsigned short i = 1; i < (!currentToken.high? currentToken.low: currentToken.high); ++i) {
                        result = cloneGraph(previousState, currentState, id, &subStart, &subEnd);
                        if (result != REGEX_PARSE_OK) {
                            return result;
                        }

                        if (newCurrent) {
                            LINK_STATES(newCurrent, subStart, EMPTY);
                        } else {
                            newPrevious = subStart;
                        }
                        
                        if (i >= currentToken.low) {
                            LINK_STATES(subStart, anchorState, EMPTY);
                        }

                        newCurrent = subEnd;
                    }

                    if (!currentToken.high) {
                        LINK_STATES(subEnd, subStart, EMPTY);
                    }
                     
                    if (!currentToken.low) {
                        LINK_STATES(previousState, anchorState, EMPTY);
                    }

                    if (!newPrevious) {
                        LINK_STATES(currentState, anchorState, EMPTY);
                        previousState = currentState;
                    } else {
                        LINK_STATES(currentState, newPrevious, EMPTY); 
                        LINK_STATES(newCurrent, anchorState, EMPTY); 
                        previousState = newCurrent;
                    } 
                    currentState = anchorState;     
                }
                break;
        }
        if (result == REGEX_PARSE_OK) {
            result = readNextToken(first, last, &currentToken);
        }
    }

    LINK_STATES(currentState, *endState, EMPTY);

    if (result == REGEX_PARSE_END) {
        return REGEX_PARSE_OK;
    }

    return result;
}

static unsigned int validateGraph(char **first, char *last) {
    token currentToken;
    unsigned int result = readNextToken(first, last, &currentToken);
    while (result == REGEX_PARSE_OK) {
        switch (currentToken.type) {
            case REGEX_SYMBOL:
            case REGEX_UNION:
            case REGEX_PLUS:
                break;
            case REGEX_STAR:
            case REGEX_QUESTION:
            {
                char *nextFirst = *first; 
                token nextToken;
                unsigned int nextResult = readNextToken(&nextFirst, last, &nextToken); 
                if (nextResult == REGEX_PARSE_OK && nextToken.type == REGEX_STAR) {
                    return ERR_REGEX_INVALID;
                }
            }
            case REGEX_REGEX:
                result = validateGraph(first, last);
                if (result != REGEX_PARSE_OK) {
                    return result;
                }
                    
                break;
        }

        if (result == REGEX_PARSE_OK) {
            result = readNextToken(first, last, &currentToken);
        }
    }

    if (result == REGEX_PARSE_END) {
        return REGEX_PARSE_OK;
    }

    return REGEX_PARSE_OK;
}

static unsigned short calculateHash(state **list, 
                                    unsigned short stateListwidth) {
    unsigned int hash = 5381;
    for (unsigned short i = 0; i < stateListwidth; ++i) {
        hash = ((hash << 5) + hash) + list[i]->id;
    }   

    return hash;
}

static unsigned int calculateHashFromTwo(state *first,
                                         state *second) {
    CREATE_LIST(state*);
    ADD(first);
    ADD(second);
    return calculateHash(LIST);
}

static unsigned int ensureState(unsigned short *id, 
                                state **list, 
                                unsigned short stateListwidth,
                                state **newState) {
    CREATE_STATE(id, newState);
    unsigned short cancelSpecificTransitions = 0;
    for (unsigned short i = 0; i < stateListwidth; ++i) {
        state *targetState = list[i];
        for (unsigned short ii = 0; ii < targetState->transitionswidth; ++ii) {
            transition *targetTransition = &targetState->transitions[ii];
            unsigned int result = linkStates(*newState, targetTransition->next, targetTransition->symbol, targetTransition->deterministic);
            if (result != RULES_OK) {
                return result;
            }

            if (targetTransition->symbol == REGEX_DOT && targetState->isAccept) {
                cancelSpecificTransitions = 1;
            }
        }

        if (targetState->isAccept) {
            (*newState)->isAccept = 1;
        }

        if (targetState->isReject) {
            (*newState)->isReject = 1;
        }

        if ((*newState)->isReject && (*newState)->isAccept) {
            return ERR_REGEX_CONFLICT;
        }        
    }

    // if the current state has any dot transitions to accept states
    // then all specific transitions are cancelled, this allows for the first match to succeed.
    if (cancelSpecificTransitions) {
        for (unsigned short i = 0; i < (*newState)->transitionswidth; ++i) {
            transition *currentTransition = &(*newState)->transitions[i];
            if (currentTransition->symbol != REGEX_DOT) {
                unlinkStates(*newState, currentTransition->next, currentTransition->symbol);
            }
        }
    }

    return RULES_OK;
}

static unsigned int ensureStateFromTwo(unsigned short *id, 
                                       state *first,
                                       state *second, 
                                       state **newState) {
    CREATE_LIST(state*);
    ADD(first);
    ADD(second);
    return ensureState(id, LIST, newState);
}

static unsigned int consolidateStates(state *currentState, 
                                      unsigned short *id) {
    for (unsigned short i = 0; i < currentState->transitionswidth; ++i) {
        transition *currentTransition = &currentState->transitions[i];
        if (!currentTransition->symbol) {
            state *nextState = currentTransition->next;
            if (nextState != currentState) {
                for (unsigned short ii = 0; ii < nextState->transitionswidth; ++ii) {
                    transition *nextTransition = &nextState->transitions[ii];
                    unsigned int result = linkStates(currentState, nextTransition->next, nextTransition->symbol, nextTransition->deterministic);
                    if (result != RULES_OK) {
                        return result;
                    }
                    if (nextState->refCount == 1) {
                        --nextTransition->next->refCount;
                    }
                }
            }

            if (nextState->isAccept) {
                currentState->isAccept = 1;
            }

            if (nextState->isReject) {
                currentState->isReject = 1;
            }

            if (currentState->isAccept && currentState->isReject) {
                return ERR_REGEX_CONFLICT;
            }

            deleteTransition(currentState, i);
            --i;
        }
    }

    return RULES_OK;
}

static unsigned int consolidateTransitions(state *currentState, 
                                           unsigned short *id, 
                                           state **hset) {
    transition oldTransitions[MAX_TRANSITIONS];
    unsigned short oldTransitionswidth = 0;
    transition newTransitions[MAX_TRANSITIONS];
    unsigned short newTransitionswidth = 0;
    CREATE_SET(unsigned int);

    for (unsigned short i = 0; i < currentState->transitionswidth; ++i) {
        transition *currentTransition = &currentState->transitions[i];
        CREATE_LIST(state*);
        unsigned int foundSymbol = 0;
        unsigned char symbolExists = 0;
        EXISTS(currentTransition->symbol, &symbolExists);
        if (!symbolExists) {
            SET(currentTransition->symbol);
            for (unsigned short ii = i + 1; ii < currentState->transitionswidth; ++ ii) {
                transition *targetTransition = &currentState->transitions[ii];
                if (currentTransition->symbol == targetTransition->symbol) {
                    foundSymbol = currentTransition->symbol;
                    if (LIST_EMPTY()) {
                        ADD(currentTransition->next);
                        oldTransitions[oldTransitionswidth].symbol = currentTransition->symbol;
                        oldTransitions[oldTransitionswidth].next = currentTransition->next;
                        ++oldTransitionswidth;
                    }

                    ADD(targetTransition->next);
                    oldTransitions[oldTransitionswidth].symbol = targetTransition->symbol;
                    oldTransitions[oldTransitionswidth].next = targetTransition->next;
                    ++oldTransitionswidth;
                }
            }

            if (!LIST_EMPTY()) {
                state *newState;
                unsigned int newStateHash = calculateHash(LIST);
                HGET(newStateHash, &newState);
                if (!newState) {
                    unsigned int result = ensureState(id, LIST, &newState);
                    if (result != REGEX_PARSE_OK) {
                        return result;
                    }

                    newState->hash = newStateHash;
                    HSET(newState);
                } 

                newTransitions[newTransitionswidth].symbol = foundSymbol;
                newTransitions[newTransitionswidth].next = newState;
                ++newTransitionswidth;
            }
        }
    }

    for (unsigned short i = 0; i < oldTransitionswidth; ++i) {
        unlinkStates(currentState, oldTransitions[i].next, oldTransitions[i].symbol);
    }

    for (unsigned short i = 0; i < newTransitionswidth; ++i) {
        LINK_STATES(currentState, newTransitions[i].next, newTransitions[i].symbol);
    }

    return RULES_OK;
}

static unsigned int consolidateDot(state *currentState, 
                                   unsigned short *id, 
                                   state **hset) {
    transition oldTransitions[MAX_TRANSITIONS];
    unsigned short oldTransitionswidth = 0;
    transition newTransitions[MAX_TRANSITIONS];
    unsigned short newTransitionswidth = 0;
    
    for (unsigned short i = 0; i < currentState->transitionswidth; ++i) {
        transition *currentTransition = &currentState->transitions[i];
        for (unsigned short ii = i + 1; ii < currentState->transitionswidth; ++ ii) {
            transition *targetTransition = &currentState->transitions[ii];
            if ((currentTransition->symbol == REGEX_DOT && targetTransition->symbol != REGEX_DOT && !targetTransition->deterministic) ||
                (currentTransition->symbol != REGEX_DOT && !currentTransition->deterministic && targetTransition->symbol == REGEX_DOT)){
                state *newState;
                unsigned int newStateHash = calculateHashFromTwo(currentTransition->next, targetTransition->next);
                HGET(newStateHash, &newState);
                if (!newState) {
                    unsigned int result = ensureStateFromTwo(id, currentTransition->next, targetTransition->next, &newState);
                    if (result != REGEX_PARSE_OK) {
                        return result;
                    }

                    newState->hash = newStateHash;
                    HSET(newState);
                } 

                if (currentTransition->symbol == REGEX_DOT) {
                    oldTransitions[oldTransitionswidth].symbol = targetTransition->symbol;
                    oldTransitions[oldTransitionswidth].next = targetTransition->next;
                } else {
                    oldTransitions[oldTransitionswidth].symbol = currentTransition->symbol;
                    oldTransitions[oldTransitionswidth].next = currentTransition->next;
                }
                
                newTransitions[newTransitionswidth].symbol = oldTransitions[oldTransitionswidth].symbol;
                newTransitions[newTransitionswidth].next = newState;
                ++oldTransitionswidth;
                ++newTransitionswidth;

            } 
        }   
    }
    
    for (unsigned short i = 0; i < oldTransitionswidth; ++i) {
        unlinkStates(currentState, oldTransitions[i].next, oldTransitions[i].symbol);
    }
    
    for (unsigned short i = 0; i < newTransitionswidth; ++i) {
        LINK_STATES_D(currentState, newTransitions[i].next, newTransitions[i].symbol);
    }
    
    return RULES_OK;
}

static unsigned int transformToDFA(state *nfa, 
                                   unsigned short *id) {

    CREATE_HASHSET(state*);
    CREATE_QUEUE(state*);
    unsigned char visited[MAX_STATES] = {0};
    state *currentState = nfa;
    visited[currentState->id] = 1;
    while (currentState) {
        unsigned int result = consolidateStates(currentState, id);
        if (result != RULES_OK) {
            return result;
        }

        result = consolidateTransitions(currentState, id, HASHSET);
        if (result != REGEX_PARSE_OK) {
            return result;
        }
        

        for (int i = 0; i < currentState->transitionswidth; ++ i) {
            transition *currentTransition = &currentState->transitions[i];
            if (!visited[currentTransition->next->id]) {
                visited[currentTransition->next->id] = 1;
                ENQUEUE(currentTransition->next);
            }
        }

        DEQUEUE(&currentState);
    }

    return RULES_OK;
}

static unsigned int expandDot(state *nfa, 
                              unsigned short *id) {

    CREATE_HASHSET(state*);
    CREATE_QUEUE(state*);
    unsigned char visited[MAX_STATES] = {0};
    state *currentState = nfa;
    visited[currentState->id] = 1;
    while (currentState) {
        unsigned int result = consolidateDot(currentState, id, HASHSET);
        if (result != REGEX_PARSE_OK) {
           return result;
        }

        for (int i = 0; i < currentState->transitionswidth; ++ i) {
            transition *currentTransition = &currentState->transitions[i];
            if (!visited[currentTransition->next->id]) {
                visited[currentTransition->next->id] = 1;
                ENQUEUE(currentTransition->next);
            }
        }

        DEQUEUE(&currentState);    
    }

    return RULES_OK;
}

static unsigned int calculateGraphDimensions(state *start, 
                                        unsigned short *vocabularywidth,
                                        unsigned short *stateswidth) {
    *vocabularywidth = 0;
    *stateswidth = 0;
    CREATE_QUEUE(state*);
    unsigned char visited[MAX_STATES] = {0};
    CREATE_SET(unsigned int);
    state *currentState = start;
    visited[currentState->id] = 1;
    while (currentState) {
        ++*stateswidth;
        for (int i = 0; i < currentState->transitionswidth; ++ i) {
            transition *currentTransition = &currentState->transitions[i];
            unsigned char symbolExists = 0;
            EXISTS(currentTransition->symbol, &symbolExists);
            if (!symbolExists) {
                SET(currentTransition->symbol);
                ++*vocabularywidth;
            }

            if (!visited[currentTransition->next->id]) {
                visited[currentTransition->next->id] = 1;
                ENQUEUE(currentTransition->next);
            }
        }

        DEQUEUE(&currentState);    
    }

    return RULES_OK;
}

static void setIndex(symbolEntry *symbolHashSet, unsigned short vocabularywidth, unsigned int symbol, unsigned short index) {
    unsigned int max = vocabularywidth * 2;
    unsigned int i = symbol % max;
    while (symbolHashSet[i].symbol) {
        i = (i + 1) % max;
    }
    symbolHashSet[i].symbol = symbol;
    symbolHashSet[i].index = index;
}

static unsigned short getIndex(symbolEntry *symbolHashSet, unsigned short vocabularywidth, unsigned int symbol) {
    unsigned int max = vocabularywidth * 2;
    unsigned int i = symbol % max;
    while (symbolHashSet[i].symbol) {
        if (symbolHashSet[i].symbol == symbol) {
            return symbolHashSet[i].index;
        }
        i = (i + 1) % max;
    }

    return 0;
}

static unsigned int packGraph(state *start, 
                              void *stateMachine,
                              unsigned short vocabularywidth,
                              unsigned short stateswidth,
                              char caseInsensitive) {
    CREATE_QUEUE(state*);
    unsigned short visited[MAX_STATES] = {0};
    symbolEntry *symbolHashSet = (symbolEntry *)stateMachine;
    unsigned short *stateTable = (unsigned short *)(symbolHashSet + vocabularywidth * 2);
    unsigned char *acceptVector = (unsigned char *)(stateTable + (vocabularywidth * stateswidth));
    unsigned short stateNumber = 1;
    unsigned short vocabularyNumber = 1;
    state *currentState = start;
    visited[currentState->id] = stateNumber;
    ++stateNumber;
    while (currentState) {
        unsigned short targetStateNumber = visited[currentState->id];
        if (currentState->isAccept) {
            acceptVector[targetStateNumber - 1] = 1;
        }

        for (int i = 0; i < currentState->transitionswidth; ++ i) {
            transition *currentTransition = &currentState->transitions[i];
            unsigned int currentTransitionSymbol = currentTransition->symbol;
            if (caseInsensitive && currentTransitionSymbol != REGEX_DOT) {
                currentTransitionSymbol = tolower(currentTransitionSymbol);
            }

            if (!getIndex(symbolHashSet, vocabularywidth, currentTransitionSymbol)) {
                setIndex(symbolHashSet, vocabularywidth, currentTransitionSymbol, vocabularyNumber);
                ++vocabularyNumber;
            }

            if (!visited[currentTransition->next->id]) {
                visited[currentTransition->next->id] = stateNumber;
                ++stateNumber;
                ENQUEUE(currentTransition->next);
            }

            unsigned short targetSymbolNumber = getIndex(symbolHashSet, vocabularywidth, currentTransitionSymbol);
            stateTable[stateswidth * (targetSymbolNumber - 1) + (targetStateNumber - 1)] = visited[currentTransition->next->id];
        }

        DEQUEUE(&currentState);    
    }

    return RULES_OK;
}

unsigned int validateRegex(char *first, 
                           char *last) {
    return validateGraph(&first, last);
}

unsigned int compileRegex(void *tree, 
                          char *first, 
                          char *last, 
                          char caseInsensitive,
                          unsigned short *vocabularywidth,
                          unsigned short *stateswidth,
                          unsigned int *regexStateMachineOffset) {
    state *start;
    state *end;
    unsigned short id = 0;
    unsigned int result = createGraph(&first, last, &id, &start, &end);
    if (result != RULES_OK) {
        return result;
    }
    end->isAccept = 1;
    ++start->refCount;

#ifdef _PRINT
    printf("*** NFA ***\n");
    printGraph(start);
#endif

    result = transformToDFA(start, &id);
    if (result != RULES_OK) {
        return result;
    }

#ifdef _PRINT
    printf("*** DFA 1 ***\n");
    printGraph(start);
#endif

    result = expandDot(start, &id);
    if (result != RULES_OK) {
        return result;
    }

#ifdef _PRINT
    printf("*** DOT 1 ***\n");
    printGraph(start);
#endif

    result = transformToDFA(start, &id);
    if (result != RULES_OK) {
        return result;
    }

#ifdef _PRINT
    printf("*** DFA ***\n");
    printGraph(start);
#endif

    result = calculateGraphDimensions(start, 
                                 vocabularywidth,
                                 stateswidth);
    if (result != RULES_OK) {
        return result;
    }

    if (!*vocabularywidth || !*stateswidth) {
        return ERR_REGEX_INVALID;
    }


    void *newStateMachine;    
    result = storeRegexStateMachine((ruleset *)tree, 
                                    *vocabularywidth,
                                    *stateswidth,
                                    &newStateMachine,
                                    regexStateMachineOffset);
    if (result != RULES_OK) {
        return result;
    }
    return packGraph(start, 
                     newStateMachine, 
                     *vocabularywidth,
                     *stateswidth,
                     caseInsensitive);
}

unsigned char evaluateRegex(void *tree,
                            char *first,
                            unsigned short width,
                            char caseInsensitive,
                            unsigned short vocabularywidth,
                            unsigned short stateswidth,
                            unsigned int regexStateMachineOffset) {
    symbolEntry *symbolHashSet = (symbolEntry *)&((ruleset *)tree)->regexStateMachinePool[regexStateMachineOffset];
    unsigned short *stateTable = (unsigned short *)(symbolHashSet + vocabularywidth * 2);
    unsigned char *acceptVector = (unsigned char *)(stateTable + (vocabularywidth * stateswidth));
    unsigned short currentState = 1;
    char *last = first + width;
    while (first < last) {
        unsigned int unicodeSymbol;
        if (utf8ToUnicode(&first, last, &unicodeSymbol) != REGEX_PARSE_OK) {
            return 0;
        } else {
            if (caseInsensitive) {
                unicodeSymbol = tolower(unicodeSymbol);
            }

            unsigned short currentSymbol = getIndex(symbolHashSet, vocabularywidth, unicodeSymbol);
            if (!currentSymbol) {
                currentSymbol = getIndex(symbolHashSet, vocabularywidth, REGEX_DOT);
                if (!currentSymbol) {
                    return 0;
                }

                currentState = stateTable[stateswidth * (currentSymbol - 1) + (currentState - 1)];
                if (!currentState) {
                    return 0;
                }
            } else {
                unsigned short futureState = stateTable[stateswidth * (currentSymbol - 1) + (currentState - 1)];
                if (futureState) {
                    currentState = futureState;
                } else {
                    currentSymbol = getIndex(symbolHashSet, vocabularywidth, REGEX_DOT);
                    if (!currentSymbol) {
                        return 0;
                    }

                    currentState = stateTable[stateswidth * (currentSymbol - 1) + (currentState - 1)];
                    if (!currentState) {
                        return 0;
                    }
                }
            }
        }
    }
    return acceptVector[currentState - 1];
}
