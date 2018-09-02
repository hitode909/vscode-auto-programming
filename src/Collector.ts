import { exec } from 'child_process';
import { quote } from 'shell-quote';

type ItemList = { text: string, count: number }[];

export class Collector {
  private projectRoot: string;

constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  // " hi " to "hi"
  trim (str: string): string {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  // "hi there" to "there"
  shorten (str: string): string {
    return str.replace(/^\s*\S*\s*/, '');
  }

  // (my $a =, =, my $b = 2) to my $a = 2
  merge (original: string, query: string, found: string): string {
    const index1 = original.indexOf(query);
    const index2 = found.indexOf(query);
    return original.substr(0, index1) + found.substr(index2);
  }

  horizontal(query: string, skip: number): Promise<ItemList> {
    query = this.trim(query);
    return new Promise((resolve) => {
      if (!query) {
        return resolve([]);
      }

      if (!skip) {
        skip = 0;
      }

      var shortQuery = query;
      for (var i = 0; i < skip; i++) {
        shortQuery = this.shorten(shortQuery);
      }

      if (!shortQuery) {
        resolve([]);
      }

      const command = quote(['git', 'grep', '--fixed-strings', '-h', shortQuery]);

      exec(command, {cwd: this.projectRoot}, (err, stdout, stderr) => {
        const lines = stdout.split(/\n/);

        // When not found, make query shorter and search again.
        // For example, "const a = 1" -> "a = 1" -> "= 1" -> "1".
        if (lines.length === 0) {
          return this.horizontal(query, ++skip).then((candidates) => {
            resolve(candidates);
          });
        }

        const counts: { [key: string]: number}  = {};

        lines.forEach(line => {
          const candidate = this.merge(query, shortQuery, this.trim(line));
          if (candidate.length === 0) {
            return;
          }
          if (candidate === shortQuery) {
            return;
          }
          if (!counts[candidate]) {
            counts[candidate] = 0;
          }
          counts[candidate] += 1;
        });

        const result = this.summarize(counts);
        resolve(result);
      });
    });
  }

  vertical (query: string): Promise<ItemList>  {
    return new Promise((resolve) => {
      if (!query) {
        return resolve([]);
      }

      const command = quote(['git', 'grep', '-A1', '--fixed-strings', '-h', query]);

      exec(command, {cwd: this.projectRoot}, (err, stdout, stderr) => {
        const lines = stdout.split(/\n/);

        if (lines.length === 0) {
          resolve([]);
          return;
        }

        const counts: { [key: string]: number}  = {};
        while(lines.length > 0) {
          if (this.trim(lines.shift() || '') !== '--') {
            continue;
          }
          const line = lines.shift();
          if (!line) { continue; }
          const header = this.trim(line);
          if (!header) {
            continue;
           }

           if (header !== query) {
             continue;
           }

          const candidate = this.trim(lines.shift() || '');
          if (!candidate) { continue; }

           if (!counts[candidate]) {
             counts[candidate] = 0;
           }
           counts[candidate] += 1;
        }

        const result = this.summarize(counts);
        resolve(result);
      });
    });
  }

  summarize (counts: { [key: string]: number}): ItemList {
    const sorted = Object.keys(counts).sort((a, b)=> counts[b] - counts[a]);
    const result = sorted.slice(0, 50).map(line => {
      return {
        text: line,
        count: counts[line],
      };
    });
    return result;
  }
}
