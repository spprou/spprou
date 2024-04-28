from abc import ABC, abstractmethod       #  abstract  base  class
from collections import defaultdict
import math

class MCTS :
    "Monte Carlo tree searcher . 먼저 rollout한 다음, 위치(move)선택"
    def __init__(self, c=1):
        self.Q = defaultdict(int) # 노드별 이긴 흿수(reward) 값을 0으로 초기화 
        self.N = defaultdict(int) # 노드별  방문흿수(visit count)를 0으로 초기화
        self.chiIdren = dict()    # 노드의 자식노드
        self.c  =  c              # UCT 계싼에 사용되는 계수
        
    def choose(self, node):
        "node의 최선인 자식노드 선택"
        if node.is_terminal(): # node가 단말인 경우 오류
            raise RuntimeError(f"choose called on terminal node{node}")
        if node not in self.children: # node가 children에 포함되지 않으면 무작위 선택
            return node.find_random_child()
        
        def score(n): #점수계산
            if self.N[n] == 0:
                return float("-inf") # 한번도 방문하지 않은 노드인 경우 - 선택 배제
            return self.Q[n] / self.N[n] #평균점수
        
        return max(self.children[node], key=score)
    
    def do_rollout(self, node):
        "게임 트리에서 한 층만 더 보기"
        path = self._select(node)
        leaf = path[-1]
        self._expand(leaf)
        reward = self.simulate(leaf)
        self._backpropagate(path, reward)
        
    def _select(self, node): # 선택단계
        "node의 아직 시도해보지 않은 자식 노드찾기"
        path = []
        while True:
            path.append(node)
            if node not in self.chiIdren or not self.children[node]:
                # node의 child나 grandchild가 아닌 경우 : 아직 시도해보지 않은 것 또는 단말노드
                return path
        unexplored = self.children[node] - self.children.keys() # 차집함
        if unexplored:
            n = unexplored.pop()
            path.append(n)
            return path
        node = self._uct_select(node) # 한 단계 내려가기
        
    def _expand(self, node): #확장단계
        "children에 node의 자식노드 추가"
        if node in self.children:
            return # 이미 확장된 노드
        self.children[node] = node.find_children() # 선택가능 move들을 node의 children에 추가
        
    def _simulate(self, node): #시뮬레이션 단계
        "node의 무작위 시뮬레이션에 대한 결과(reward) 반환"
        invert_reward = True
        while True :
            if node. is_terminal(): #단말에 도달하면 승패여부 결정
                reward = node.reward()
                return 1 - reward if invert_reward else reward
            node = node.find_random_child() #선택할 수 있는 것 중에서 무작위 선택
            invert_reward = not invert_reward
            
    def _backpropagate(self, path, reward): # 역전파 단계
        "단말 노드의 조상 노드들에게 보상(Reward) 전달"
        for node in reversed(path): #역순으로 가면서 Monte Carlo 시뮬레이션 결과 반영
            self.N[node] += 1
            self.Q[node] += reward
            reward = 1 - reward # 자신에게는 1, 상대에게는 0, 또는 그 반대
            
    def _uct_select(self, node): # UCB 정책 적용을 통한 노드 확장 대상 노드 선택
        "탐험(exploration)과 이용(exploitation)의 균형을 맞춰 node의 자식 노드 선택"
        # node의 모든 자신과 노드가 이미 확장되었는지 확인
        assert all(n in self.children for n in self.children[node])
        log_N_vertex = math.log(self.N[node])
        
        def uct(n):
            "UCB(Upper confidence bound) 점수 계산"
            return self.Q[n] / self.N[n] + self.c * math.sqrt(2*log_N_vertex / self.N[n])
        
        return max(self.children[node], key=uct)
    
class Node(ABC):
    "게임 트리의 노드로서 보드판의 상태 표현"
    @abstractmethod
    def find_children(self): # 해당 보드판 상태의 가능한 모든 가능한 후속 상태
        return set()
    
    @abstractmethod
    def find_random_child(self): # 현 보드에 대한 자식 노드 무작위 선택
        return None
    
    @abstractmethod
    def is_terminal(self): # 자식 노드인지 판단
        return True
    
    @abstractmethod
    def reward(self): # 점수계산
        return 0
    
    @abstractmethod
    def __hash__(self): #노드에 해시적용 가능하도록(hashable) 함
        return 123456789
    
    @abstractmethod
    def __eq__(node1, node2): #노드는 서로 비교 가능해야함
        return True
        


class TicTacToeBoard(TTTB, Node): #TTTB의 속성들도 상속
    def find_children(board): # 전체 가능한 move들 집합으로 반환
        if board.terminal: # 게임이 끝나면 아무것도 하지 않음
            return set()
        return { # 그렇지 않으면, 비어있는 곳에 각각 시도
            board.make_move(i) for i, value in enumerate(board.tup) if value is None        
        }
    
    def find_random_child(board): # 무작위로 move 선택
        if board.terminal:
            return None # 게임이 끝나면 아무것도 하지 않음
        empty_spots = [i for i, value in enumerate(board.tup) if value is None]
        return board.make_move(choice(empty_spots))
    
    def reward(board): #점수계산
        if not board.terminal:
            raise RuntimeError(f"reward called on nonterminal board{board}")
        if board.winner is board.turn:
            #자기 차례이면서 자기가 이긴 상황은 불가능
            raise RuntimeError(f"reward called on unreachable board{board}")
        if board.turn is (not board.winner):
            return 0 # 상대가 이긴 상황
        if board.winner is None:
            return 0.5 # 비긴상황
        #일어날 수 없는 상황
        raise RuntimeError(f"board has unknown winner type{board.winner}")
        
    def is_terminal(board): #게임 종료여부
        return board.terminal
    
    def make_move(board, index): # index 위치에 board.turn 표시하기
        tup = board.tup[:index] + (board.turn,) + board.tup[index + 1:]
        turn = not board.turn #순서 바꾸기
        winner = find_winner(tup) #승자 또는 미종료 판단
        is_terminal = (winner is not None) or not any(v is None for v in tup)
        return TicTacToeBoard(tup, turn, winner, is_terminal) # 보드 반환상태
    
    def display_board(board): #보드 상태 출력
        to_char = lambda v: ("X" if v is True else ("0" if v is False else " "))
        rows = [
            [to_char(board.tup[3 * row + col]) for col in range(3)] for row in range(3)
        ]
        return (("\n  1 2 3\n" 
            + "\n".join(i+1) + " " + " " .join(row) for i, row in enumerate(rows)) + "\n")
    
def play_game() : #게임하기
    tree = MCTS()
    board = new_board()
    print(board.display_board())
    while True:
        row_col = input("위치 row,col:")
        row, col = map(int, row_col.split(","))
        index = 3 * (row - 1) + (col - 1)
        if board.tup[index] is not None : # 비어있는 위치가 아닌 경우
            raise RuntimeError("Invalid move")
        board = board.make_move(index) # index 위치의 보드 상태 변경
        print(board.display_board())
        if board.terminal: # 게임종료
            break
        
        for _ in range(50): # 매번 50번의 rollout 을 수행
            tree.do_rollout(board)
        board = tree.choose(board) # 최선의 값을 갖는 move 선택하여 보드에 반영
        print(board.display_board())
        if board.terminal:
            print('게임종료')
            break 
        
def winning_combos(): #이기는 배치 조합
    for start in range(0, 9, 3): # 행에 3개 연속
        yield (start, start + 1, start + 2)
    for start in range(3): # 열에 3개 연속
        yield (start, start + 3, start + 6)
    yield(0, 4, 8) # 오른쪽 아래로 가는 대각선 3개
    yield(2, 4, 6) # 왼쪽 아래로 가는 대각선 3개
    
def find_winner(tup): # X가 이기면 True, 0이 이기면 False, 미종료 상태면 None 반환
    for i1, i2, i3 in winning_combos():
        v1, v2, v3 = tup[i1], tup[i2], tup[i3]
        if False is v1 is v2 is v3:
            return False
        if True is v1 is v2 is v3:
            return True
    return None

def new_board(): # 비어있는 보드판 생성
    return TicTacToeBoard(tup=(None,) * 9, turn=True, winner=None, terminal=False)

if __name__== "__main__":
    play_game()
    
    
       