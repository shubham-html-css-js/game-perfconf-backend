const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { connectToDb, getDb } = require("./db");
const PORT = process.env.PORT || 4000;
const app = express();
let db;
connectToDb((err) => {
  if (!err) {
    app.listen(PORT, () => {
      console.log(`app listening on port ${PORT}`);
    });
    db = getDb();
  }
});
// app.use("*", (req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
//   res.setHeader("Access-Control-Allow-Methods", "*");
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "Content-Type, Authorization, access-control-allow-method, access-control-allow-origin, content-type"
//   );
//   next();
// });
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.post("/team", async (req, res) => {
  let { teamName, password } = req.body;
  console.log(teamName);
  const alreadyExists = await db
    .collection("team_info")
    .findOne({ $and: [{ teamName: teamName }, { password: password }] });

  console.log(alreadyExists);
  if (alreadyExists) {
    console.log(alreadyExists);
    res.send({
      status: 200,
      msg: "Success!! Team Exists",
    });
  } else {
    res.send({
      status: 404,
      msg: "Team does not exist",
    });
  }
});

app.post("/findTeam", async (req, res) => {
  let { teamName } = req.body;
  const team = await db.collection("team_info").findOne({ teamName: teamName });
  res.send({
    status: 200,
    res: team,
  });
});

app.post("/submit", async (req, res) => {
  let {
    selectedCoordinates,
    isCoordinate,
    isTrap,
    isSuperTrap,
    isReveal,
    teamName,
    teamTurn,
  } = req.body;
  const team = await db.collection("team_info").findOne({ teamName: teamName });
  const turnInfo = await db.collection("turn_info").findOne({});
  console.log(turnInfo);
  console.log(team);
  if (selectedCoordinates.length === 0)
    return res.send({
      status: 404,
      msg: "You have not selected anything",
    });
  if (
    teamTurn.length === 0 ||
    turnInfo.rem_teams[turnInfo.currIndex] === team.teamId
  ) {
    if (isCoordinate === true) {
      if (selectedCoordinates.length < 3)
        res.send({
          status: 404,
          msg: "Please Select atleast 3 coordinates",
        });
      else if (selectedCoordinates.length > 4)
        res.send({
          status: 404,
          msg: "You cannot select more than 4 coordinates",
        });
      else {
        await db
          .collection("team_info")
          .updateOne(
            { teamName },
            { $set: { coordinates: selectedCoordinates } }
          );
        const baseTeam = await db
          .collection("team_info")
          .findOne({ teamName: "uperf" });
        console.log(baseTeam);
        await db
          .collection("team_info")
          .updateOne(
            { teamName: "uperf" },
            { $set: { readyToStart: baseTeam.readyToStart + 1 } }
          );
        res.send({
          status: 200,
          res: true,
        });
      }
    } else if (isTrap === true) {
      if (selectedCoordinates.length > team.trapsLeft) {
        res.send({
          status: 404,
          msg: `${
            team.trapsLeft > 0
              ? `You only have ${team.trapsLeft} traps left`
              : "You have 0 traps"
          }`,
        });
      } else {
        for (let i = 0; i < selectedCoordinates.length; i++)
          await db
            .collection("team_info")
            .updateOne(
              { teamName },
              { $push: { trapCoordinates: selectedCoordinates[i] } }
            );
        await db.collection("team_info").updateOne(
          { teamName },
          {
            $set: {
              trapsLeft: team.trapsLeft - selectedCoordinates.length,
              counter: teamTurn.length > 0 ? team.counter + 1 : team.counter,
            },
          }
        );
        if ((team.counter + 1) % 2 === 0) {
          let turn_info = await db.collection("turn_info").findOne({});
          await db.collection("turn_info").updateOne(
            {},
            {
              $set: {
                currIndex:
                  (turn_info.currIndex + 1) % turn_info.rem_teams.length,
              },
            }
          );
        }
        res.send({
          status: 200,
          res: true,
        });
      }
    } else if (isSuperTrap === true) {
      if (selectedCoordinates.length > team.superTrapsLeft) {
        res.send({
          status: 404,
          msg: `${
            team.superTrapsLeft > 0
              ? `You only have ${team.superTrapsLeft} super traps left`
              : "You have 0 super traps"
          }`,
        });
      } else {
        if (team.choicesLeft === 0)
          await db
            .collection("team_info")
            .updateOne({ teamName }, { $set: { choicesLeft: 2 } });
        for (let i = 0; i < selectedCoordinates.length; i++)
          await db
            .collection("team_info")
            .updateOne(
              { teamName },
              { $push: { superTrapCoordinates: selectedCoordinates[i] } }
            );
        await db.collection("team_info").updateOne(
          { teamName },
          {
            $set: {
              superTrapsLeft: team.superTrapsLeft - selectedCoordinates.length,
              counter: teamTurn.length > 0 ? team.counter + 1 : team.counter,
            },
          }
        );
        if ((team.counter + 1) % 2 === 0) {
          let turn_info = await db.collection("turn_info").findOne({});
          await db.collection("turn_info").updateOne(
            {},
            {
              $set: {
                currIndex:
                  (turn_info.currIndex + 1) % turn_info.rem_teams.length,
              },
            }
          );
        }
        res.send({
          status: 200,
          res: true,
        });
      }
    } else if (isReveal === true) {
      if (selectedCoordinates.length > 1) {
        return res.send({
          status: 404,
          msg: "You cannot reveal more than 1 square at once",
        });
      } else {
        if (
          (selectedCoordinates[0] >= 0 && selectedCoordinates[0] <= 16) ||
          (selectedCoordinates[0] >= 52 && selectedCoordinates[0] <= 68) ||
          (selectedCoordinates[0] >= 104 && selectedCoordinates[0] <= 120) ||
          (selectedCoordinates[0] >= 156 && selectedCoordinates[0] <= 172) ||
          (selectedCoordinates[0] >= 208 && selectedCoordinates[0] <= 224) ||
          (selectedCoordinates[0] >= 260 && selectedCoordinates[0] <= 276) ||
          (selectedCoordinates[0] >= 312 && selectedCoordinates[0] <= 328) ||
          (selectedCoordinates[0] >= 364 && selectedCoordinates[0] <= 380) ||
          (selectedCoordinates[0] >= 416 && selectedCoordinates[0] <= 432) ||
          (selectedCoordinates[0] >= 468 && selectedCoordinates[0] <= 484) ||
          (selectedCoordinates[0] >= 520 && selectedCoordinates[0] <= 536) ||
          (selectedCoordinates[0] >= 572 && selectedCoordinates[0] <= 588) ||
          (selectedCoordinates[0] >= 624 && selectedCoordinates[0] <= 640) ||
          (selectedCoordinates[0] >= 676 && selectedCoordinates[0] <= 692) ||
          (selectedCoordinates[0] >= 728 && selectedCoordinates[0] <= 744) ||
          (selectedCoordinates[0] >= 780 && selectedCoordinates[0] <= 796) ||
          (selectedCoordinates[0] >= 832 && selectedCoordinates[0] <= 848)
        ) {
          let idx;
          const targetTeam = await db
            .collection("team_info")
            .findOne({ allowedRange: 0 });
          idx = targetTeam.coordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: targetTeam.teamName },
                { $push: { revealed: selectedCoordinates[0] } }
              );
            let array = targetTeam.coordinates;
            array.splice(idx, 1);
            await db.collection("team_info").updateOne(
              { teamName: targetTeam.teamName },
              {
                $set: { coordinates: array },
              }
            );

            if (targetTeam.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(targetTeam.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: targetTeam.color,
            });
          }
          idx = targetTeam.trapCoordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $push: { revealed: team.coordinates[0] } }
              );
            let array = team.coordinates;
            array.splice(idx, 1);
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $set: { coordinates: array } }
              );

            if (team.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }

          idx = targetTeam.superTrapCoordinates?.indexOf(
            selectedCoordinates[0]
          );
          if (idx != -1 && idx !== undefined) {
            if (team.coordinates.length === 1) {
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $push: { revealed: team.coordinates[0] } }
                );
              let array = team.coordinates;
              array.splice(idx, 1);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            } else if (team.coordinates.length > 1) {
              await db.collection("team_info").updateOne(
                { teamName: team.teamName },
                {
                  $push: {
                    revealed: {
                      $each: [team.coordinates[0], team.coordinates[1]],
                    },
                  },
                }
              );
              let array = team.coordinates;
              array.splice(idx, 2);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            }
            if (
              team.coordinates.length === 0
            ) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }
          if ((team.counter + 1) % 2 === 0) {
            let turn_info = await db.collection("turn_info").findOne({});
            await db.collection("turn_info").updateOne(
              {},
              {
                $set: {
                  currIndex:
                    (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                },
              }
            );
          }
          await db
            .collection("team_info")
            .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
          await db.collection("team_info").updateOne(
            {
              teamName,
            },
            {
              $push: {
                missed: selectedCoordinates[0],
              },
            }
          );
          return res.send({
            status: 404,
            msg: "Empty try",
          });
        } else if (
          (selectedCoordinates[0] >= 17 && selectedCoordinates[0] <= 33) ||
          (selectedCoordinates[0] >= 69 && selectedCoordinates[0] <= 85) ||
          (selectedCoordinates[0] >= 121 && selectedCoordinates[0] <= 137) ||
          (selectedCoordinates[0] >= 173 && selectedCoordinates[0] <= 189) ||
          (selectedCoordinates[0] >= 225 && selectedCoordinates[0] <= 241) ||
          (selectedCoordinates[0] >= 277 && selectedCoordinates[0] <= 293) ||
          (selectedCoordinates[0] >= 329 && selectedCoordinates[0] <= 345) ||
          (selectedCoordinates[0] >= 381 && selectedCoordinates[0] <= 397) ||
          (selectedCoordinates[0] >= 433 && selectedCoordinates[0] <= 449) ||
          (selectedCoordinates[0] >= 485 && selectedCoordinates[0] <= 501) ||
          (selectedCoordinates[0] >= 537 && selectedCoordinates[0] <= 553) ||
          (selectedCoordinates[0] >= 589 && selectedCoordinates[0] <= 605) ||
          (selectedCoordinates[0] >= 641 && selectedCoordinates[0] <= 657) ||
          (selectedCoordinates[0] >= 693 && selectedCoordinates[0] <= 709) ||
          (selectedCoordinates[0] >= 745 && selectedCoordinates[0] <= 761) ||
          (selectedCoordinates[0] >= 797 && selectedCoordinates[0] <= 813) ||
          (selectedCoordinates[0] >= 849 && selectedCoordinates[0] <= 865)
        ) {
          let idx;
          const targetTeam = await db
            .collection("team_info")
            .findOne({ allowedRange: 17 });
          console.log(targetTeam);
          console.log(targetTeam.coordinates);
          console.log(selectedCoordinates[0]);
          idx = targetTeam.coordinates?.indexOf(selectedCoordinates[0]);
          console.log(idx);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: targetTeam.teamName },
                { $push: { revealed: selectedCoordinates[0] } }
              );
            console.log(targetTeam.coordinates);
            let array = targetTeam.coordinates;
            array.splice(idx, 1);
            console.log(array);
            await db.collection("team_info").updateOne(
              { teamName: targetTeam.teamName },
              {
                $set: { coordinates: array },
              }
            );
            console.log(targetTeam)
            if (targetTeam.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(targetTeam.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            res.send({
              status: 200,
              res: targetTeam.color,
            });
            return;
          }
          idx = targetTeam.trapCoordinates?.indexOf(selectedCoordinates[0]);
          console.log(idx);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $push: { revealed: team.coordinates[0] } }
              );
            let array = team.coordinates;
            array.splice(idx, 1);
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $set: { coordinates: array } }
              );
            if (team.coordinates.length ===0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }

          idx = targetTeam.superTrapCoordinates?.indexOf(
            selectedCoordinates[0]
          );
          console.log(idx);
          if (idx != -1 && idx !== undefined) {
            if (team.coordinates.length === 1) {
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $push: { revealed: team.coordinates[0] } }
                );
              let array = team.coordinates;
              array.splice(idx, 1);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            } else if (team.coordinates.length > 1) {
              await db.collection("team_info").updateOne(
                { teamName: team.teamName },
                {
                  $push: {
                    revealed: {
                      $each: [team.coordinates[0], team.coordinates[1]],
                    },
                  },
                }
              );
              let array = team.coordinates;
              array.splice(idx, 2);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            }
            if (
              team.coordinates.length === 0
            ) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }
          console.log("empty shot outside");
          console.log(team.choicesLeft - 1);

          if ((team.counter + 1) % 2 === 0) {
            let turn_info = await db.collection("turn_info").findOne({});
            await db.collection("turn_info").updateOne(
              {},
              {
                $set: {
                  currIndex:
                    (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                },
              }
            );
          }
          await db
            .collection("team_info")
            .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
          console.log("after api call");
          await db.collection("team_info").updateOne(
            {
              teamName,
            },
            {
              $push: {
                missed: selectedCoordinates[0],
              },
            }
          );
          return res.send({
            status: 404,
            msg: "Empty try",
          });
        } else if (
          (selectedCoordinates[0] >= 35 && selectedCoordinates[0] <= 51) ||
          (selectedCoordinates[0] >= 87 && selectedCoordinates[0] <= 103) ||
          (selectedCoordinates[0] >= 139 && selectedCoordinates[0] <= 155) ||
          (selectedCoordinates[0] >= 191 && selectedCoordinates[0] <= 207) ||
          (selectedCoordinates[0] >= 243 && selectedCoordinates[0] <= 259) ||
          (selectedCoordinates[0] >= 295 && selectedCoordinates[0] <= 311) ||
          (selectedCoordinates[0] >= 347 && selectedCoordinates[0] <= 363) ||
          (selectedCoordinates[0] >= 399 && selectedCoordinates[0] <= 415) ||
          (selectedCoordinates[0] >= 451 && selectedCoordinates[0] <= 467) ||
          (selectedCoordinates[0] >= 503 && selectedCoordinates[0] <= 519) ||
          (selectedCoordinates[0] >= 555 && selectedCoordinates[0] <= 571) ||
          (selectedCoordinates[0] >= 607 && selectedCoordinates[0] <= 623) ||
          (selectedCoordinates[0] >= 659 && selectedCoordinates[0] <= 675) ||
          (selectedCoordinates[0] >= 711 && selectedCoordinates[0] <= 727) ||
          (selectedCoordinates[0] >= 763 && selectedCoordinates[0] <= 779) ||
          (selectedCoordinates[0] >= 815 && selectedCoordinates[0] <= 831) ||
          (selectedCoordinates[0] >= 867 && selectedCoordinates[0] <= 883)
        ) {
          console.log("35");
          let idx;
          const targetTeam = await db
            .collection("team_info")
            .findOne({ allowedRange: 35 });
          idx = targetTeam.coordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: targetTeam.teamName },
                { $push: { revealed: selectedCoordinates[0] } }
              );
            let array = targetTeam.coordinates;
            array.splice(idx, 1);
            await db.collection("team_info").updateOne(
              { teamName: targetTeam.teamName },
              {
                $set: { coordinates: array },
              }
            );
            if (targetTeam.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(targetTeam.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: targetTeam.color,
            });
          }
          idx = targetTeam.trapCoordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $push: { revealed: team.coordinates[0] } }
              );
            let array = team.coordinates;
            array.splice(idx, 1);
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $set: { coordinates: array } }
              );
            if (team.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }

          idx = targetTeam.superTrapCoordinates?.indexOf(
            selectedCoordinates[0]
          );
          if (idx != -1 && idx !== undefined) {
            if (team.coordinates.length === 1) {
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $push: { revealed: team.coordinates[0] } }
                );
              let array = team.coordinates;
              array.splice(idx, 1);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            } else if (team.coordinates.length > 1) {
              await db.collection("team_info").updateOne(
                { teamName: team.teamName },
                {
                  $push: {
                    revealed: {
                      $each: [team.coordinates[0], team.coordinates[1]],
                    },
                  },
                }
              );
              let array = team.coordinates;
              array.splice(idx, 2);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            }
            if (
              team.coordinates.length === 0
            ) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }
          if ((team.counter + 1) % 2 === 0) {
            let turn_info = await db.collection("turn_info").findOne({});
            await db.collection("turn_info").updateOne(
              {},
              {
                $set: {
                  currIndex:
                    (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                },
              }
            );
          }
          await db
            .collection("team_info")
            .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
          await db.collection("team_info").updateOne(
            {
              teamName,
            },
            {
              $push: {
                missed: selectedCoordinates[0],
              },
            }
          );
          return res.send({
            status: 404,
            msg: "Empty try",
          });
        } else if (
          (selectedCoordinates[0] >= 936 && selectedCoordinates[0] <= 952) ||
          (selectedCoordinates[0] >= 988 && selectedCoordinates[0] <= 1004) ||
          (selectedCoordinates[0] >= 1040 && selectedCoordinates[0] <= 1056) ||
          (selectedCoordinates[0] >= 1092 && selectedCoordinates[0] <= 1108) ||
          (selectedCoordinates[0] >= 1144 && selectedCoordinates[0] <= 1160) ||
          (selectedCoordinates[0] >= 1196 && selectedCoordinates[0] <= 1212) ||
          (selectedCoordinates[0] >= 1248) & (selectedCoordinates[0] <= 1264) ||
          (selectedCoordinates[0] >= 1300 && selectedCoordinates[0] <= 1316) ||
          (selectedCoordinates[0] >= 1352 && selectedCoordinates[0] <= 1368) ||
          (selectedCoordinates[0] >= 1404 && selectedCoordinates[0] <= 1420) ||
          (selectedCoordinates[0] >= 1456 && selectedCoordinates[0] <= 1472) ||
          (selectedCoordinates[0] >= 1508 && selectedCoordinates[0] <= 1524) ||
          (selectedCoordinates[0] >= 1560 && selectedCoordinates[0] <= 1576) ||
          (selectedCoordinates[0] >= 1612 && selectedCoordinates[0] <= 1628) ||
          (selectedCoordinates[0] >= 1664 && selectedCoordinates[0] <= 1680) ||
          (selectedCoordinates[0] >= 1716 && selectedCoordinates[0] <= 1732) ||
          (selectedCoordinates[0] >= 1768 && selectedCoordinates[0] <= 1784)
        ) {
          console.log("936");
          let idx;
          const targetTeam = await db
            .collection("team_info")
            .findOne({ allowedRange: 936 });
          idx = targetTeam.coordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: targetTeam.teamName },
                { $push: { revealed: selectedCoordinates[0] } }
              );
            let array = targetTeam.coordinates;
            array.splice(idx, 1);
            await db.collection("team_info").updateOne(
              { teamName: targetTeam.teamName },
              {
                $set: { coordinates: array },
              }
            );
            if (targetTeam.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(targetTeam.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: targetTeam.color,
            });
          }
          idx = targetTeam.trapCoordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $push: { revealed: team.coordinates[0] } }
              );
            let array = team.coordinates;
            array.splice(idx, 1);
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $set: { coordinates: array } }
              );
            if (team.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }

          idx = targetTeam.superTrapCoordinates?.indexOf(
            selectedCoordinates[0]
          );
          if (idx != -1 && idx !== undefined) {
            if (team.coordinates.length === 1) {
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $push: { revealed: team.coordinates[0] } }
                );
              let array = team.coordinates;
              array.splice(idx, 1);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            } else if (team.coordinates.length > 1) {
              await db.collection("team_info").updateOne(
                { teamName: team.teamName },
                {
                  $push: {
                    revealed: {
                      $each: [team.coordinates[0], team.coordinates[1]],
                    },
                  },
                }
              );
              let array = team.coordinates;
              array.splice(idx, 2);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            }
            if (
              team.coordinates.length === 0
            ) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }

            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }
          if ((team.counter + 1) % 2 === 0) {
            let turn_info = await db.collection("turn_info").findOne({});
            await db.collection("turn_info").updateOne(
              {},
              {
                $set: {
                  currIndex:
                    (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                },
              }
            );
          }
          await db
            .collection("team_info")
            .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
          await db.collection("team_info").updateOne(
            {
              teamName,
            },
            {
              $push: {
                missed: selectedCoordinates[0],
              },
            }
          );
          return res.send({
            status: 404,
            msg: "Empty try",
          });
        } else if (
          (selectedCoordinates[0] >= 953 && selectedCoordinates[0] <= 969) ||
          (selectedCoordinates[0] >= 1005 && selectedCoordinates[0] <= 1021) ||
          (selectedCoordinates[0] >= 1057 && selectedCoordinates[0] <= 1073) ||
          (selectedCoordinates[0] >= 1109 && selectedCoordinates[0] <= 1125) ||
          (selectedCoordinates[0] >= 1161 && selectedCoordinates[0] <= 1177) ||
          (selectedCoordinates[0] >= 1213 && selectedCoordinates[0] <= 1229) ||
          (selectedCoordinates[0] >= 1265 && selectedCoordinates[0] <= 1281) ||
          (selectedCoordinates[0] >= 1317 && selectedCoordinates[0] <= 1333) ||
          (selectedCoordinates[0] >= 1369 && selectedCoordinates[0] <= 1385) ||
          (selectedCoordinates[0] >= 1421 && selectedCoordinates[0] <= 1437) ||
          (selectedCoordinates[0] >= 1473 && selectedCoordinates[0] <= 1489) ||
          (selectedCoordinates[0] >= 1525 && selectedCoordinates[0] <= 1541) ||
          (selectedCoordinates[0] >= 1577 && selectedCoordinates[0] <= 1593) ||
          (selectedCoordinates[0] >= 1629 && selectedCoordinates[0] <= 1645) ||
          (selectedCoordinates[0] >= 1681 && selectedCoordinates[0] <= 1697) ||
          (selectedCoordinates[0] >= 1733 && selectedCoordinates[0] <= 1749) ||
          (selectedCoordinates[0] >= 1785 && selectedCoordinates[0] <= 1801)
        ) {
          console.log("953");
          let idx;
          const targetTeam = await db
            .collection("team_info")
            .findOne({ allowedRange: 953 });
          idx = targetTeam.coordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: targetTeam.teamName },
                { $push: { revealed: selectedCoordinates[0] } }
              );
            let array = targetTeam.coordinates;
            array.splice(idx, 1);
            await db.collection("team_info").updateOne(
              { teamName: targetTeam.teamName },
              {
                $set: { coordinates: array },
              }
            );
            if (targetTeam.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(targetTeam.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: targetTeam.color,
            });
          }
          idx = targetTeam.trapCoordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $push: { revealed: team.coordinates[0] } }
              );
            let array = team.coordinates;
            array.splice(idx, 1);
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $set: { coordinates: array } }
              );
            if (team.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }

          idx = targetTeam.superTrapCoordinates?.indexOf(
            selectedCoordinates[0]
          );
          if (idx != -1 && idx !== undefined) {
            if (team.coordinates.length === 1) {
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $push: { revealed: team.coordinates[0] } }
                );
              let array = team.coordinates;
              array.splice(idx, 1);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            } else if (team.coordinates.length > 1) {
              await db.collection("team_info").updateOne(
                { teamName: team.teamName },
                {
                  $push: {
                    revealed: {
                      $each: [team.coordinates[0], team.coordinates[1]],
                    },
                  },
                }
              );
              let array = team.coordinates;
              array.splice(idx, 2);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            }
            if (
              team.coordinates.length === 0
            ) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }
          if ((team.counter + 1) % 2 === 0) {
            let turn_info = await db.collection("turn_info").findOne({});
            await db.collection("turn_info").updateOne(
              {},
              {
                $set: {
                  currIndex:
                    (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                },
              }
            );
          }
          await db
            .collection("team_info")
            .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
          await db.collection("team_info").updateOne(
            {
              teamName,
            },
            {
              $push: {
                missed: selectedCoordinates[0],
              },
            }
          );
          return res.send({
            status: 404,
            msg: "Empty try",
          });
        } else if (
          (selectedCoordinates[0] >= 971 && selectedCoordinates[0] <= 987) ||
          (selectedCoordinates[0] >= 1023 && selectedCoordinates[0] <= 1039) ||
          (selectedCoordinates[0] >= 1075 && selectedCoordinates[0] <= 1091) ||
          (selectedCoordinates[0] >= 1127 && selectedCoordinates[0] <= 1143) ||
          (selectedCoordinates[0] >= 1179 && selectedCoordinates[0] <= 1195) ||
          (selectedCoordinates[0] >= 1231 && selectedCoordinates[0] <= 1247) ||
          (selectedCoordinates[0] >= 1283 && selectedCoordinates[0] <= 1299) ||
          (selectedCoordinates[0] >= 1335 && selectedCoordinates[0] <= 1351) ||
          (selectedCoordinates[0] >= 1387 && selectedCoordinates[0] <= 1403) ||
          (selectedCoordinates[0] >= 1439 && selectedCoordinates[0] <= 1455) ||
          (selectedCoordinates[0] >= 1491 && selectedCoordinates[0] <= 1507) ||
          (selectedCoordinates[0] >= 1543 && selectedCoordinates[0] <= 1559) ||
          (selectedCoordinates[0] >= 1595 && selectedCoordinates[0] <= 1611) ||
          (selectedCoordinates[0] >= 1647 && selectedCoordinates[0] <= 1663) ||
          (selectedCoordinates[0] >= 1699 && selectedCoordinates[0] <= 1715) ||
          (selectedCoordinates[0] >= 1751 && selectedCoordinates[0] <= 1767) ||
          (selectedCoordinates[0] >= 1803 && selectedCoordinates[0] <= 1819)
        ) {
          console.log("971");
          let idx;
          const targetTeam = await db
            .collection("team_info")
            .findOne({ allowedRange: 971 });
          idx = targetTeam.coordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: targetTeam.teamName },
                { $push: { revealed: selectedCoordinates[0] } }
              );
            let array = targetTeam.coordinates;
            array.splice(idx, 1);
            await db.collection("team_info").updateOne(
              { teamName: targetTeam.teamName },
              {
                $set: { coordinates: array },
              }
            );
            if (targetTeam.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(targetTeam.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: targetTeam.color,
            });
          }
          idx = targetTeam.trapCoordinates?.indexOf(selectedCoordinates[0]);
          if (idx != -1 && idx !== undefined) {
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $push: { revealed: team.coordinates[0] } }
              );
            let array = team.coordinates;
            array.splice(idx, 1);
            await db
              .collection("team_info")
              .updateOne(
                { teamName: team.teamName },
                { $set: { coordinates: array } }
              );
            if (team.coordinates.length === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }

          idx = targetTeam.superTrapCoordinates?.indexOf(
            selectedCoordinates[0]
          );
          if (idx != -1 && idx !== undefined) {
            if (team.coordinates.length === 1) {
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $push: { revealed: team.coordinates[0] } }
                );
              let array = team.coordinates;
              array.splice(idx, 1);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            } else if (team.coordinates.length > 1) {
              await db.collection("team_info").updateOne(
                { teamName: team.teamName },
                {
                  $push: {
                    revealed: {
                      $each: [team.coordinates[0], team.coordinates[1]],
                    },
                  },
                }
              );
              let array = team.coordinates;
              array.splice(idx, 2);
              await db
                .collection("team_info")
                .updateOne(
                  { teamName: team.teamName },
                  { $set: { coordinates: array } }
                );
            }
            if (
              team.coordinates.length === 0
            ) {
              let turn_info = await db.collection("turn_info").findOne({});
              let index = turn_info.rem_teams.indexOf(team.teamId);
              let newArr = turn_info.rem_teams;
              let el = newArr.splice(index, 1);
              await db
                .collection("turn_info")
                .updateOne({}, { $set: { rem_teams: newArr } });
              await db
                .collection("turn_info")
                .updateOne({}, { $push: { el_teams: el[0] } });
            }
            if ((team.counter + 1) % 2 === 0) {
              let turn_info = await db.collection("turn_info").findOne({});
              await db.collection("turn_info").updateOne(
                {},
                {
                  $set: {
                    currIndex:
                      (turn_info.currIndex + 1) % turn_info.rem_teams.length,
                  },
                }
              );
            }
            await db
              .collection("team_info")
              .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
            return res.send({
              status: 200,
              res: team.color,
            });
          }
        }
        if ((team.counter + 1) % 2 === 0) {
          let turn_info = await db.collection("turn_info").findOne({});
          await db.collection("turn_info").updateOne(
            {},
            {
              $set: {
                currIndex:
                  (turn_info.currIndex + 1) % turn_info.rem_teams.length,
              },
            }
          );
        }
        await db
          .collection("team_info")
          .updateOne({ teamName }, { $set: { counter: team.counter + 1 } });
        return res.send({
          status: 404,
          msg: "Empty try",
        });
      }
      console.log("empty shot");
      await db
        .collection("team_info")
        .updateOne(
          { teamName },
          { $set: { choicesLeft: team.choicesLeft - 1 } }
        );
      return res.send({
        status: 404,
        msg: "Empty try",
      });
    } else if (isSabotage === true) {
      await db.collection("turnCounter").updateOne(
        {},
        {
          $set: {
            currentTurn: (currentTurn + 1) % 7,
          },
        }
      );
      indexes = db.collection("turnCounter").getIndexes();
      res.send({
        status: 200,
        res: indexes,
      });
    }
  } else {
    res.send({
      status: 404,
      msg: "Its not your teams turn!! Kindly wait",
    });
  }
});
