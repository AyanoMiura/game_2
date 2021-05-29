import { ApiAction } from "../../api/api.action";
import { PgameApi } from "../../api/pgame-api";
import { GameController } from "../game-controller";
import { GameAction } from "../game.action";
import { CjScene } from "./cj-scene";
import { TextField } from "../textFiled";
import { Ball } from "./ball";
import { Timer } from "./timer";
import { Gun } from "./gun";
import { Coin } from "./coin";
import { Rotate } from "./rotate";

/**
 * Createjs用のGAME画面
 */
export class GameCjScene extends CjScene {
  private pageGame: lib.PageGame = new lib.PageGame();
  private startFlag: boolean = false;

  //ボールの生成
  private ball = new Ball();
  private removeBallCount: number = 0; //消したボールのカウント
  private sameBallBehind: number = 0; //配列前方の数字が同じボールカウント
  private sameBallAhead: number = 0; //配列後方の数字が同じボールカウント
  private indexBallBehind: number = 0; //配列の前方index
  private indexBallAhead: number = 0; //配列の後方index
  private hitBallArrCopy: [lib.Ball, number, number, number, createjs.Tween][] =
    []; //hitしたボールの情報をコピー
  private searchIndex: number = 0; //index検索用
  private isPaused: boolean = false; //tween停止フラグ
  private indexPlusNum: number = 1; //indexの調整数字
  private indexMinusNum: number = 0; //indexの調整数字
  // private coordinateArr: [number, number][] = []; //hit時の座標取得

  //ゲームオーバー
  private gameOverText: lib.GameOver = new lib.GameOver();

  //回転
  private WIDTH: number = 648; //画面幅
  private HEIGHT: number = 486; //画面高さ
  private centerX: number = this.WIDTH / 2; //円の中心ｘ座標
  private centerY: number = this.HEIGHT / 2; //円の中心ｙ座標
  private radius = 200;
  private speed = 3;
  private angle = 0;

  //gun
  private gun: Gun = new Gun();

  //スコア
  private scoreLetter: lib.ScoreLetter = new lib.ScoreLetter();
  private scoreText: TextField = new TextField("0", lib.CountNumber, 0, 3);
  private score: number = 0;
  private popUpScore: TextField = new TextField("0", lib.CountNumber, 0, 3);

  //timer
  private timer: Timer = new Timer();
  private timerLetter: lib.TimeLetter = new lib.TimeLetter();
  private timerText: TextField = new TextField("0", lib.CountNumber, 0, 5);

  //coin
  private coin: Coin = new Coin();
  // private rotate: Rotate = new Rotate();

  constructor() {
    super("GAME");
    // this.pageGame.btnNext.addEventListener('click', async () => {
    //   console.log('GAME → RESULT');
    //   // - score の登録-
    //   await GameController.dispatchSync(GameAction.gameStateSet({
    //     gameState: {
    //       ...GameController.getState().game.gameState,
    //       score: 100,
    //     },
    //   }));
    //   // - 画面遷移 -
    //   GameController.dispatch(GameAction.sceneChange({ sceneName: 'RESULT' }));
    // });
    // this.pageGame.btnBack.addEventListener('click', () => {
    //   console.log('GAME → TOP');
    //   GameController.dispatch(GameAction.sceneChange({ sceneName: 'TOP' }));
    // });

    // this.pageGame.btnPlus.addEventListener('click', () => {
    //   GameController.dispatch(ApiAction.run({ api: PgameApi.adPopUp() }));
    // });
  }

  willMount() {
    this.container.addChild(this.pageGame);

    //中心（仮）穴に接近中あたり判定範囲
    var shape = new createjs.Shape();
    shape.graphics.beginFill("DarkRed");
    shape.graphics.drawRect(250, 280, 150, 60);
    this.pageGame.addChild(shape);

    //発射台
    this.gun.gun.x = this.centerX;
    this.gun.gun.y = this.centerY;
    this.pageGame.addChild(this.gun.gun);

    //基準点A
    var shape1 = new createjs.Shape();
    shape1.graphics.beginFill("DarkRed");
    shape1.graphics.drawRect(this.gun.gun.x, this.gun.gun.y, 10, 10);
    this.pageGame.addChild(shape1);

    this.gun.ballContainer.x = this.gun.gun.x;
    this.gun.ballContainer.y = this.gun.gun.y;
    this.pageGame.addChild(this.gun.ballContainer);

    //玉の初期セット
    this.gun.init(this.startFlag);

    //スコア表示
    this.scoreLetter.x = 10;
    this.scoreLetter.y = 10;
    this.pageGame.addChild(this.scoreLetter);

    this.scoreText.x = 10;
    this.scoreText.y = 40;
    this.scoreText.scaleX = 0.8;
    this.scoreText.scaleY = 0.8;
    this.pageGame.addChild(this.scoreText);

    //timer
    this.timerLetter.x = 500;
    this.timerLetter.y = 10;
    this.pageGame.addChild(this.timerLetter);

    this.timerText.x = 500;
    this.timerText.y = 40;
    this.timerText.scaleX = 0.8;
    this.timerText.scaleY = 0.8;
    this.timerText.text("00" + ":" + "00");
    this.timer.initTimer();
    this.pageGame.addChild(this.timerText);

    //穴
    this.ball.holeDraw(this.pageGame);

    this.startFlag = true;
    GameController.dispatch(ApiAction.run({ api: PgameApi.started() }));
    GameController.dispatch(ApiAction.run({ api: PgameApi.playcountup() }));
  }

  //ball同士あたり判定
  private isHitBall = () => {
    for (let i = 0; i < this.ball.ballAndNumArr.length; i++) {
      for (let j = 0; j < this.gun.shotBallArr.length; j++) {
        if (
          this.ball.checkHitBall(
            this.ball.ballAndNumArr[i][0],
            this.gun.shotBallArr[j][0]
          )
        ) {
          this.removeBallCount = 0;
          this.sameBallBehind = 0;
          this.sameBallAhead = 0;

          //足して１０なら削除
          this.addBallNum(this.ball.ballAndNumArr, this.gun.shotBallArr, i, j);
        }
      }
    }
  };

  private addBallNum(
    hitBall: [lib.Ball, number, number, number, createjs.Tween][],
    hitOtherBall: [lib.Ball, number, number, number?, createjs.Tween?][],
    ballIndex: number,
    gunBallIndex: number
  ): boolean {
    //足して10で消える
    if (hitBall[ballIndex][1] + hitOtherBall[gunBallIndex][1] === 10) {
      //hitしたボールの情報を得る
      this.hitBallArrCopy.push(hitBall[ballIndex]);

      console.group("当たり番号");
      console.log("ball", hitBall[ballIndex][1]);
      console.log("other", hitOtherBall[gunBallIndex][1]);
      console.groupEnd();

      //隣を検索
      this.checkBallArr(ballIndex);

      this.moveBall();

      //当たったら削除
      this.pageGame.removeChild(hitBall[ballIndex][0]);
      this.pageGame.removeChild(hitOtherBall[gunBallIndex][0]);

      this.removeBallCount++;

      // //スコア
      // let scoreNum = 10 + 10 * this.removeBallCount;
      // this.score += scoreNum;
      // this.scoreText.text(this.score);
      // this.scorePop(hitOtherBall[gunBallIndex][0], scoreNum);

      //後方の配列削除
      hitBall.splice(
        this.indexBallAhead - this.sameBallAhead,
        this.sameBallAhead
      );

      hitBall.splice(ballIndex, 1);
      hitOtherBall.splice(gunBallIndex, 1);

      //前方の配列削除
      hitBall.splice(this.indexBallBehind + 1, this.sameBallBehind);
      console.log("::::::::::",hitBall);

      return true;
    } else {
      return false;
    }
  }

  // private getCoordinate(index: number) {
  //   this.coordinateArr = [];
  //   for (let i = 0; i < index; i++) {
  //     //座標を格納
  //     this.coordinateArr.push([
  //       this.ball.ballAndNumArr[i][0].x,
  //       this.ball.ballAndNumArr[i][0].y,
  //     ]);
  //   }
  // }

  //hit時のボールの動き...TODO変数初期化
  private moveBall() {
    //hit時の４番目の数字を入れる
    let hitIndex = this.hitBallArrCopy[0][3];
    this.hitBallArrCopy = [];
    const searchArr: number[][] = [];
    this.searchIndex = 0;

    //numがある数字を二次元配列に入れる
    for (let i = 0; i < this.ball.ballAndNumArr.length; i++) {
      searchArr.push([i, this.ball.ballAndNumArr[i].indexOf(hitIndex)]);
      //n番目の２個目の要素が3で帰ってきてたらsearchIndex
      if (searchArr[i][1] === 3) {
        this.searchIndex = i;

        console.group("アニメーション");
        console.log("hitIndex", hitIndex);
        console.log("search配列", searchArr);
        console.log("searchインデックス", this.searchIndex);
        console.log("i", i);
        console.groupEnd();
      }
    }
    hitIndex = 0;
    //前後で動きを分ける
    const promises: Array<Promise<void>> = this.ball.ballAndNumArr.map(
      (ball, i) => {
        return new Promise((resolve) => {
          //後方
          if (i > this.searchIndex) {
            // ball[4].timeScale = 2
            // createjs.Tween.get(ball[0])
            //   .to({ alpha: 0.5 }, 500)
            //   .call(() => resolve());

            resolve();
          } else {
            //前方
            this.isPaused = true;
            //tween停止
            ball[4].paused = true;
            // ball[4].reversed = true;
            resolve();
          }
        });
      }
    );
    Promise.all(promises).then(() => {
      //再生
    });
  }

  //配列ボール同士の当たり判定
  private isHitOtherBall() {
    const behindIndex = this.searchIndex - 1;
    const aheadIndex = this.searchIndex;

    if (this.searchIndex > 0) {
      if (
        this.ball.checkHitOtherBall(
          this.ball.ballAndNumArr[behindIndex][0],
          this.ball.ballAndNumArr[aheadIndex][0]
        )
      ) {
        //checkBallArrに渡す数字
        this.indexPlusNum = 2;
        //足して10なら削除
        const promises: Array<Promise<void>> = this.ball.ballAndNumArr.map(
          () => {
            return new Promise((resolve) => {
              this.addBallNum(
                this.ball.ballAndNumArr,
                this.ball.ballAndNumArr,
                behindIndex,
                aheadIndex
              );

              resolve();
            });
          }
        );
        Promise.all(promises).then(() => {
          //再生

          this.ball.ballAndNumArr.forEach((ball) => {
            //tween動かす
            ball[4].paused = false;
          });
          this.isPaused = false;
        });
      }

      // console.log(this.ball.ballAndNumArr[behindIndex]);
      // console.log(this.ball.ballAndNumArr[aheadIndex]);
    } else {
      this.isPaused = false;
    }
  }

  //配列内の前後で同じ数字がないかチェック
  private checkBallArr = (index: number) => {
    //後ろを検索

    this.indexBallAhead = 0;
    for (
      this.indexBallAhead = index + 1;
      this.indexBallAhead < this.ball.ballAndNumArr.length;
      this.indexBallAhead++
    ) {
      console.group("当たり判定後方");
      console.log(
        "配列後方num",
        this.ball.ballAndNumArr[this.indexBallAhead][1]
      );
      console.log("当たったボール", this.ball.ballAndNumArr[index][1]);
      console.log("indexBallAhead", this.indexBallAhead);
      console.groupEnd();

      if (
        this.ball.ballAndNumArr[index][1] !==
        this.ball.ballAndNumArr[this.indexBallAhead][1]
      ) {
        console.log("break", this.ball.ballAndNumArr[this.indexBallAhead][1]);
        console.log("checkBall", this.sameBallAhead);
        console.log("splice2", this.ball.ballAndNumArr);
        break;
      } else {
        this.pageGame.removeChild(
          this.ball.ballAndNumArr[this.indexBallAhead][0]
        );
        this.sameBallAhead++;

        this.removeBallCount++;
      }
    }

    //前を検索
    this.indexBallBehind = 0;
    if (this.ball.ballAndNumArr.length > 0) {
      for (
        this.indexBallBehind = index - 1;
        this.indexBallBehind > -1;
        this.indexBallBehind--
      ) {
        console.group("当たり判定前方");
        console.log(
          "配列前方num",
          this.ball.ballAndNumArr[this.indexBallBehind][1]
        );
        console.log("当たったボール", this.ball.ballAndNumArr[index][1]);
        console.log("indexBallBehind", this.indexBallBehind);
        console.groupEnd();

        if (
          this.ball.ballAndNumArr[index][1] !==
          this.ball.ballAndNumArr[this.indexBallBehind][1]
        ) {
          console.log("splice2", this.ball.ballAndNumArr);
          console.log("break", this.ball.ballAndNumArr[this.indexBallBehind][1]);
          console.log("checkBall", this.sameBallBehind);
          break;
        } else {
          this.pageGame.removeChild(
            this.ball.ballAndNumArr[this.indexBallBehind][0]
          );
          this.sameBallBehind++;
          this.removeBallCount++;
        }
      }
    }
  };

  //スコアのポップアップ
  private scorePop = (pos: lib.Ball, num: number) => {
    this.popUpScore.x = pos.x - 20;
    this.popUpScore.y = pos.y - 5;
    this.popUpScore.scaleX = 0.6;
    this.popUpScore.scaleY = 0.6;
    this.popUpScore.alpha = 0;
    this.popUpScore.text(num);
    this.pageGame.addChild(this.popUpScore);

    createjs.Tween.get(this.popUpScore)
      .to({ alpha: 1 }, 800)
      .to({ alpha: 0 }, 800)
      .call(() => {
        this.pageGame.removeChild(this.popUpScore);
      });
  };

  //コインあたり判定
  // private isHitCoin = () => {
  //   for (let i = 0; i < this.gun.shotBallArr.length; i++) {
  //     if (this.coin.checkHitCoin(this.gun.shotBallArr[i][0], this.coin.coin)) {
  //       this.ball.colorFlag = false;
  //       this.gun.colorFlag = false;

  //       this.coin.changeColor(
  //         this.ball.ballAndNumArr,
  //         this.ball.colorFlag,
  //         this.gun.colorFlag
  //       );

  //       this.pageGame.removeChild(this.gun.shotBallArr[i][0]);
  //       this.pageGame.removeChild(this.coin.coin);
  //       this.gun.shotBallArr.splice(i, 1);

  //       window.setTimeout(() => {
  //         this.ball.colorFlag = true;
  //         this.gun.colorFlag = true;
  //       }, 10000);
  //     }
  //   }
  // };

  //穴hit時
  // private isHitHole() {
  //   //穴に入った時
  //   for (let i = 0; i < this.ball.ballAndNumArr.length; i++) {
  //     if (
  //       this.ball.checkHitHole(
  //         this.ball.ballAndNumArr[0][0],
  //         this.ball.blackHole
  //       )
  //     ) {
  //       this.ball.stopFlag = true;
  //       this.pageGame.mouseEnabled = false;
  //       clearInterval(this.coin.resetId);
  //       //tweenの速さを早くする
  //       this.ball.ballAndNumArr[i][4].timeScale = 50;
  //       const ballLength = this.ball.ballAndNumArr.length;

  //       //最後のボールが吸い込まれたらgameOverを出す
  //       if (
  //         this.ball.checkHitHole(
  //           this.ball.ballAndNumArr[ballLength - 1][0],
  //           this.ball.blackHole
  //         )
  //       ) {
  //         this.pageGame.removeChild(this.ball.ballAndNumArr[i][0]);
  //         this.gameOver();
  //       }
  //     }
  //   }
  // }

  //ゲームオーバー
  private gameOver() {
    this.gameOverText.x = 0;
    this.gameOverText.y = 0;
    this.gameOverText.alpha = 0;
    this.pageGame.addChild(this.gameOverText);
    const overTween = createjs.Tween.get(this.gameOverText).to(
      { alpha: 1 },
      2000
    );

    this.pageGame.removeEventListener("pressup", this.handleUp);
    createjs.Ticker.removeEventListener("tick", this.loop);

    window.setTimeout(() => {
      GameController.dispatchSync(
        GameAction.gameStateSet({
          gameState: { score: this.score, time: this.timer.totalTime },
        })
      ).then(() => {
        GameController.dispatch(
          GameAction.sceneChange({ sceneName: "RESULT" })
        );
      });
    }, 3000);
  }

  //マウスアップ
  private handleUp = () => {
    this.gun.mouseUp(this.pageGame, this.container);
  };

  //メインループ
  private loop = () => {
    this.ball.randomBall(this.pageGame);
    this.gun.mouseMove(this.container);
    this.gun.shotBall(this.pageGame);
    this.gun.removeBall(this.pageGame);
    this.isHitBall();
    // this.isHitCoin();
    // this.isHitHole();
    if (this.isPaused) {
      this.isHitOtherBall();
    }
  };

  didMount() {
    const text = new createjs.Text("This is GAME scene !!");
    this.container.addChild(text);

    //timer
    // this.timer.countUp(this.timerText);
    // //coin
    // this.coin.coinDisplay(this.pageGame);

    //ticker
    createjs.Ticker.addEventListener("tick", this.loop);

    //mouseイベント
    this.pageGame.addEventListener("pressup", this.handleUp);
    this.pageGame.mouseEnabled = true;

    GameController.dispatch(
      ApiAction.run({ api: PgameApi.ended({ score: 100 }) })
    );
  }

  //ゲーム初期化
  private initGame() {
    this.pageGame.removeAllChildren();
    this.container.removeAllChildren();
    this.gun.gun.removeChild(this.gun.gunBall);
    this.gun.gun.removeChild(this.gun.nextGunBall);
    this.ball.blackHole.rotation = 0;
    this.ball.stopFlag = false;
    this.startFlag = false;
    this.ball.holeAccessFlag = false;
    this.coin.isStopGame = false;
    this.gun.shotFlag = true;
    this.scoreText.text("0");
    this.ball.ballAndNumArr = [];
  }

  didUnMount() {
    this.initGame();
  }
}
